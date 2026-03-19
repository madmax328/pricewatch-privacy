import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import PromoCode from '@/models/PromoCode';
import Story from '@/models/Story';

const BOOK_PRICE_CENTS = 2999; // €29.99

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type, storyId, promoCode, embedded, locale: reqLocale } = await req.json();
  const userId = (session.user as { id: string; email: string }).id;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await connectToDatabase();
  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  let stripeCustomerId = user.stripeCustomerId;

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

  const lang = reqLocale || 'fr';

  if (type === 'premium') {
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
      ...(promoCode ? { discounts: [{ coupon: await getOrCreateStripeCoupon(promoCode, 'subscription') }] } : { allow_promotion_codes: true }),
      metadata: { userId: userId.toString(), plan: 'premium', promoCode: promoCode || '' },
      ...(embedded
        ? { ui_mode: 'embedded', return_url: `${appUrl}/${lang}/checkout/return?session_id={CHECKOUT_SESSION_ID}` }
        : { success_url: `${appUrl}/${lang}/dashboard?upgraded=true`, cancel_url: `${appUrl}/${lang}/pricing` }),
    };
    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);
    return embedded
      ? NextResponse.json({ clientSecret: checkoutSession.client_secret })
      : NextResponse.json({ url: checkoutSession.url });
  }

  if (type === 'superpremium') {
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_SUPERPREMIUM_PRICE_ID!, quantity: 1 }],
      ...(promoCode ? { discounts: [{ coupon: await getOrCreateStripeCoupon(promoCode, 'subscription') }] } : { allow_promotion_codes: true }),
      metadata: { userId: userId.toString(), plan: 'superpremium', promoCode: promoCode || '' },
      ...(embedded
        ? { ui_mode: 'embedded', return_url: `${appUrl}/${lang}/checkout/return?session_id={CHECKOUT_SESSION_ID}` }
        : { success_url: `${appUrl}/${lang}/dashboard?upgraded=true`, cancel_url: `${appUrl}/${lang}/pricing` }),
    };
    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);
    return embedded
      ? NextResponse.json({ clientSecret: checkoutSession.client_secret })
      : NextResponse.json({ url: checkoutSession.url });
  }

  if (type === 'book') {
    if (!storyId) {
      return NextResponse.json({ error: 'storyId required' }, { status: 400 });
    }

    // Fetch story to embed info in order
    const story = await Story.findOne({ _id: storyId, userId });
    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

    // Validate delivery address
    const addr = user.deliveryAddress;
    if (!addr?.firstName || !addr?.address || !addr?.city || !addr?.country) {
      return NextResponse.json({ error: 'delivery_address_missing' }, { status: 400 });
    }

    // Calculate discount
    let finalAmount = BOOK_PRICE_CENTS;
    let validatedPromo: { discountType: string; discountValue: number } | null = null;

    if (promoCode) {
      const promo = await PromoCode.findOne({ code: promoCode.toUpperCase().trim(), active: true });
      if (promo && (!promo.expiresAt || new Date() < promo.expiresAt) &&
          (promo.maxUses == null || promo.usedCount < promo.maxUses) &&
          (promo.appliesTo === 'all' || promo.appliesTo === 'book')) {
        validatedPromo = { discountType: promo.discountType, discountValue: promo.discountValue };
        if (promo.discountType === 'percent') {
          finalAmount = Math.round(BOOK_PRICE_CENTS * (1 - promo.discountValue / 100));
        } else {
          finalAmount = Math.max(0, BOOK_PRICE_CENTS - promo.discountValue);
        }
      }
    }

    const bookSessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Kidshade — "${story.title}"`,
              description: `Livre personnalisé pour ${story.childName}, imprimé et livré chez vous`,
            },
            unit_amount: finalAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId.toString(),
        type: 'book',
        storyId: storyId.toString(),
        promoCode: promoCode || '',
        discountAmount: String(BOOK_PRICE_CENTS - finalAmount),
      },
      ...(embedded
        ? { ui_mode: 'embedded', return_url: `${appUrl}/${lang}/checkout/return?session_id={CHECKOUT_SESSION_ID}` }
        : { success_url: `${appUrl}/${lang}/account?book=ordered`, cancel_url: `${appUrl}/${lang}/story/${storyId}` }),
    };

    const checkoutSession = await stripe.checkout.sessions.create(bookSessionParams);
    return embedded
      ? NextResponse.json({ clientSecret: checkoutSession.client_secret })
      : NextResponse.json({ url: checkoutSession.url });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

// Helper: get or create a Stripe coupon from our PromoCode
async function getOrCreateStripeCoupon(code: string, appliesTo: 'book' | 'subscription'): Promise<string> {
  const promo = await PromoCode.findOne({ code: code.toUpperCase().trim(), active: true });
  if (!promo) throw new Error('Invalid promo code');
  if (promo.appliesTo !== 'all' && promo.appliesTo !== appliesTo) throw new Error('Promo not applicable');

  // Try to find existing Stripe coupon with same ID
  const couponId = `KIDSHADE_${promo.code}`;
  try {
    await stripe.coupons.retrieve(couponId);
    return couponId;
  } catch {
    // Create it
    await stripe.coupons.create({
      id: couponId,
      ...(promo.discountType === 'percent'
        ? { percent_off: promo.discountValue }
        : { amount_off: promo.discountValue, currency: 'eur' }),
      duration: 'once',
    });
    return couponId;
  }
}
