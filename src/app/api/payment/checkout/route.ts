import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { LS_STORE_ID } from '@/lib/lemonsqueezy';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string; email: string }).id;
  const userEmail = (session.user as { id: string; email: string }).email;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { type } = await req.json(); // 'subscription' | 'book'

  if (!process.env.LEMONSQUEEZY_API_KEY) {
    return NextResponse.json({ error: 'Lemon Squeezy non configuré' }, { status: 500 });
  }

  // Subscription — Premium 2,99€/mois
  if (type === 'subscription') {
    const variantId = process.env.LEMONSQUEEZY_PREMIUM_VARIANT_ID;
    if (!variantId) {
      return NextResponse.json({ error: 'LEMONSQUEEZY_PREMIUM_VARIANT_ID manquant' }, { status: 500 });
    }

    const checkout = await createCheckout(LS_STORE_ID, variantId, {
      checkoutOptions: { dark: false },
      checkoutData: {
        email: userEmail,
        custom: { userId },
      },
      productOptions: {
        redirectUrl: `${appUrl}/fr/dashboard?upgraded=true`,
        receiptButtonText: 'Accéder au tableau de bord',
      },
    });

    const url = checkout.data?.data.attributes.url;
    if (!url) {
      return NextResponse.json({ error: 'Impossible de créer le checkout' }, { status: 500 });
    }
    return NextResponse.json({ url });
  }

  // Book order — 14,99€ one-time
  if (type === 'book') {
    const variantId = process.env.LEMONSQUEEZY_BOOK_VARIANT_ID;
    if (!variantId) {
      return NextResponse.json({ error: 'LEMONSQUEEZY_BOOK_VARIANT_ID manquant' }, { status: 500 });
    }

    await connectToDatabase();
    const user = await User.findById(userId);

    const { storyId } = await req.json().catch(() => ({})) as { storyId?: string };

    const checkout = await createCheckout(LS_STORE_ID, variantId, {
      checkoutData: {
        email: userEmail,
        custom: { userId, storyId: storyId ?? '' },
      },
      productOptions: {
        redirectUrl: `${appUrl}/fr/dashboard?book=ordered`,
        receiptButtonText: 'Voir mon tableau de bord',
        receiptThankYouNote: 'Merci pour votre commande ! Votre livre est en cours de préparation.',
      },
    });

    // Update user LS customer id if returned
    if (user && checkout.data?.data.attributes) {
      const attrs = checkout.data.data.attributes as { customer_id?: string };
      if (attrs.customer_id && !user.lsCustomerId) {
        user.lsCustomerId = String(attrs.customer_id);
        await user.save();
      }
    }

    const url = checkout.data?.data.attributes.url;
    if (!url) {
      return NextResponse.json({ error: 'Impossible de créer le checkout livre' }, { status: 500 });
    }
    return NextResponse.json({ url });
  }

  return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
}
