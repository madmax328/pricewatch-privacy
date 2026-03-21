import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
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
          phone: addr.phone || '',
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

        // Generate a unique loyalty promo code for this customer
        const loyaltyCode = generateLoyaltyCode();
        try {
          await PromoCode.create({
            code: loyaltyCode,
            discountType: 'percent',
            discountValue: 5,
            appliesTo: 'book',
            maxUses: 1,
            active: true,
          });
          await BookOrder.findByIdAndUpdate(bookOrder._id, { loyaltyPromoCode: loyaltyCode });
        } catch (err) {
          console.error('[Loyalty] Failed to create promo code:', err);
          // Non-fatal: continue without loyalty code
        }

        // Convert illustrationUrls Map to plain object
        const illustrationUrlsObj: Record<number, string> = {};
        if (story.illustrationUrls) {
          story.illustrationUrls.forEach((url: string, key: string) => {
            const idx = parseInt(key);
            if (!isNaN(idx)) illustrationUrlsObj[idx] = url;
          });
        }

        // Submit to Lulu — use waitUntil so Vercel keeps the function alive
        // until PDF generation + Lulu API call complete, without blocking the Stripe response
        waitUntil(
          submitToLulu({
            orderId: String(bookOrder._id),
            userEmail: user.email,
            storyTitle: story.title,
            childName: story.childName,
            storyContent: story.content,
            theme: story.theme || 'space',
            address: deliveryAddress,
            illustrationUrls: illustrationUrlsObj,
            loyaltyPromoCode: loyaltyCode,
          }).catch((err) => console.error('[Lulu] submission failed:', err))
        );
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const isActive = subscription.status === 'active';
      const item = subscription.items.data[0] as unknown as { current_period_end?: number };
      const periodEndTs = item?.current_period_end ?? (subscription as unknown as { current_period_end?: number }).current_period_end;
      const periodEnd = periodEndTs ? new Date(periodEndTs * 1000) : null;

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

// ── Loyalty promo code generator ──────────────────────────────────────────────
function generateLoyaltyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous I/O/0/1
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `KIDSHADE-${suffix}`;
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
  illustrationUrls?: Record<number, string>;
  loyaltyPromoCode?: string;
}) {
  const { orderId, userEmail, storyTitle, childName, storyContent, theme, address, illustrationUrls, loyaltyPromoCode } = params;

  // Cover illustration: use page 0 if available
  const coverIllustrationUrl = illustrationUrls?.[0];

  // Generate PDFs
  const [interiorBytes, coverBytes] = await Promise.all([
    generateInteriorPdf({ childName, storyTitle, storyContent, theme, illustrationUrls, loyaltyPromoCode }),
    generateCoverPdf({ childName, storyTitle, theme, coverIllustrationUrl }),
  ]);

  // Upload to Vercel Blob (publicly accessible for Lulu to fetch)
  const [interiorBlob, coverBlob] = await Promise.all([
    put(`lulu/${orderId}/interior.pdf`, Buffer.from(interiorBytes), { access: 'public', contentType: 'application/pdf' }),
    put(`lulu/${orderId}/cover.pdf`, Buffer.from(coverBytes), { access: 'public', contentType: 'application/pdf' }),
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
