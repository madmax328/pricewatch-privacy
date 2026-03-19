import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import BookOrder from '@/models/BookOrder';
import Story from '@/models/Story';
import PromoCode from '@/models/PromoCode';
import Stripe from 'stripe';
import { generateInteriorPdf, generateCoverPdf } from '@/lib/pdf-generator';
import { createLuluPrintJob } from '@/lib/lulu';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature error:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  await connectToDatabase();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as 'premium' | 'superpremium' | undefined;
      if (!userId) break;

      if (session.mode === 'subscription' && plan) {
        await User.findByIdAndUpdate(userId, {
          plan,
          stripeSubscriptionId: session.subscription as string,
        });
        // Increment promo code usage if any
        const promoCode = session.metadata?.promoCode;
        if (promoCode) {
          await PromoCode.findOneAndUpdate({ code: promoCode }, { $inc: { usedCount: 1 } });
        }
      }

      if (session.mode === 'payment' && session.metadata?.type === 'book') {
        const storyId = session.metadata?.storyId;
        const promoCode = session.metadata?.promoCode;
        const discountAmount = parseInt(session.metadata?.discountAmount || '0');

        if (!storyId) break;

        const [user, story] = await Promise.all([
          User.findById(userId),
          Story.findById(storyId),
        ]);

        if (!user || !story) break;

        const addr = user.deliveryAddress;
        if (!addr) break;

        const deliveryAddress = {
          firstName: addr.firstName || '',
          lastName: addr.lastName || '',
          address: addr.address || '',
          city: addr.city || '',
          postalCode: addr.postalCode || '',
          country: addr.country || '',
        };

        // Create BookOrder
        const bookOrder = await BookOrder.create({
          userId,
          storyId,
          storyTitle: story.title,
          childName: story.childName,
          deliveryAddress,
          amountPaid: session.amount_total || 2999,
          currency: session.currency || 'eur',
          promoCode: promoCode || undefined,
          discountAmount: discountAmount || 0,
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent as string | undefined,
          status: 'paid',
          paidAt: new Date(),
        });

        // Mark story as having a print order
        await Story.findByIdAndUpdate(storyId, { printOrdered: true });

        // Increment promo usage
        if (promoCode) {
          await PromoCode.findOneAndUpdate({ code: promoCode }, { $inc: { usedCount: 1 } });
        }

        // Submit to Lulu (async, non-blocking — errors are logged but don't affect Stripe response)
        submitToLulu({
          orderId: String(bookOrder._id),
          userEmail: user.email,
          storyTitle: story.title,
          childName: story.childName,
          storyContent: story.content,
          theme: story.theme || 'space',
          address: deliveryAddress,
        }).catch((err) => console.error('[Lulu] submission failed:', err));
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const isActive = subscription.status === 'active';
      const periodEnd = new Date(subscription.current_period_end * 1000);

      const priceId = subscription.items.data[0]?.price.id;
      let plan: 'free' | 'premium' | 'superpremium' = 'free';
      if (isActive) {
        if (priceId === process.env.STRIPE_SUPERPREMIUM_PRICE_ID) {
          plan = 'superpremium';
        } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
          plan = 'premium';
        }
      }

      await User.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        { plan, stripeCurrentPeriodEnd: periodEnd }
      );
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as { subscription?: string }).subscription;
      if (!subscriptionId) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const periodEnd = new Date(subscription.current_period_end * 1000);
      const priceId = subscription.items.data[0]?.price.id;

      let plan: 'premium' | 'superpremium' = 'premium';
      if (priceId === process.env.STRIPE_SUPERPREMIUM_PRICE_ID) {
        plan = 'superpremium';
      }

      await User.findOneAndUpdate(
        { stripeSubscriptionId: subscriptionId },
        { plan, stripeCurrentPeriodEnd: periodEnd }
      );
      break;
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      const subscription = event.data.object as Stripe.Subscription;
      await User.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        { plan: 'free', stripeSubscriptionId: null, stripeCurrentPeriodEnd: null }
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}

// ── Lulu print job submission ─────────────────────────────────────────────────
async function submitToLulu(params: {
  orderId: string;
  userEmail: string;
  storyTitle: string;
  childName: string;
  storyContent: string;
  theme: string;
  address: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
}) {
  const { orderId, userEmail, storyTitle, childName, storyContent, theme, address } = params;

  // Generate PDFs
  const [interiorBytes, coverBytes] = await Promise.all([
    generateInteriorPdf({ childName, storyTitle, storyContent, theme }),
    generateCoverPdf({ childName, storyTitle, theme }),
  ]);

  // Upload to Vercel Blob (publicly accessible for Lulu to fetch)
  const [interiorBlob, coverBlob] = await Promise.all([
    put(`lulu/${orderId}/interior.pdf`, interiorBytes, { access: 'public', contentType: 'application/pdf' }),
    put(`lulu/${orderId}/cover.pdf`, coverBytes, { access: 'public', contentType: 'application/pdf' }),
  ]);

  // Create Lulu print job
  const { luluJobId, luluOrderId } = await createLuluPrintJob({
    orderId,
    userEmail,
    storyTitle,
    coverUrl: coverBlob.url,
    interiorUrl: interiorBlob.url,
    address,
  });

  // Update BookOrder with Lulu IDs and status
  await BookOrder.findByIdAndUpdate(orderId, {
    luluJobId,
    luluOrderId,
    status: 'in_production',
  });

  console.log(`[Lulu] Print job created: jobId=${luluJobId} orderId=${luluOrderId}`);
}
