import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type } = await req.json(); // 'premium' | 'superpremium' | 'book'
  const userId = (session.user as { id: string; email: string }).id;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await connectToDatabase();
  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  let stripeCustomerId = user.stripeCustomerId;

  // Create or retrieve Stripe customer
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: userId.toString() },
    });
    stripeCustomerId = customer.id;
    user.stripeCustomerId = stripeCustomerId;
    await user.save();
  }

  if (type === 'premium') {
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
      success_url: `${appUrl}/fr/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/fr/pricing`,
      metadata: { userId: userId.toString(), plan: 'premium' },
    });
    return NextResponse.json({ url: checkoutSession.url });
  }

  if (type === 'superpremium') {
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_SUPERPREMIUM_PRICE_ID!, quantity: 1 }],
      success_url: `${appUrl}/fr/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/fr/pricing`,
      metadata: { userId: userId.toString(), plan: 'superpremium' },
    });
    return NextResponse.json({ url: checkoutSession.url });
  }

  if (type === 'book') {
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Kidshade — Livre personnalisé',
              description: 'Votre histoire imprimée et reliée, livrée chez vous',
              images: [],
            },
            unit_amount: 1499,
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/fr/dashboard?book=ordered`,
      cancel_url: `${appUrl}/fr/dashboard`,
      metadata: { userId: userId.toString(), type: 'book' },
    });
    return NextResponse.json({ url: checkoutSession.url });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
