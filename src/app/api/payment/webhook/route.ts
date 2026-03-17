import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export const runtime = 'nodejs';

// Verify Lemon Squeezy webhook signature
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') ?? '';
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? '';

  if (!secret || !verifySignature(rawBody, signature, secret)) {
    console.error('Webhook LS: signature invalide');
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  let payload: {
    meta: { event_name: string; custom_data?: { userId?: string } };
    data: {
      attributes: {
        status?: string;
        customer_id?: number;
        subscription_id?: string | number;
        first_subscription_item?: { subscription_id?: number };
      };
      id: string;
    };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const event = payload.meta.event_name;
  const userId = payload.meta.custom_data?.userId;
  const attrs = payload.data.attributes;

  await connectToDatabase();

  switch (event) {
    // ---- Subscription created (Premium activated) ----
    case 'subscription_created': {
      if (!userId) break;
      const subId = attrs.first_subscription_item?.subscription_id
        ? String(attrs.first_subscription_item.subscription_id)
        : payload.data.id;
      await User.findByIdAndUpdate(userId, {
        plan: 'premium',
        lsSubscriptionId: subId,
        lsCustomerId: attrs.customer_id ? String(attrs.customer_id) : undefined,
      });
      break;
    }

    // ---- Subscription updated ----
    case 'subscription_updated': {
      const subId = payload.data.id;
      const isActive = attrs.status === 'active';
      await User.findOneAndUpdate(
        { lsSubscriptionId: subId },
        { plan: isActive ? 'premium' : 'free' }
      );
      break;
    }

    // ---- Subscription cancelled / expired ----
    case 'subscription_cancelled':
    case 'subscription_expired': {
      const subId = payload.data.id;
      await User.findOneAndUpdate(
        { lsSubscriptionId: subId },
        { plan: 'free', lsSubscriptionId: null }
      );
      break;
    }

    // ---- One-time order (book) ----
    case 'order_created': {
      if (!userId) break;
      // Future: trigger Gelato/Printful book print job with storyId
      // const storyId = payload.meta.custom_data?.storyId;
      console.log(`Commande livre reçue pour user ${userId}`);
      break;
    }

    default:
      // Ignore unhandled events
      break;
  }

  return NextResponse.json({ received: true });
}
