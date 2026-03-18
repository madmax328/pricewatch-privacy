import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Stripe from 'stripe';

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
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const isActive = subscription.status === 'active';
      const periodEnd = new Date(subscription.current_period_end * 1000);

      // Determine plan from price ID
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
