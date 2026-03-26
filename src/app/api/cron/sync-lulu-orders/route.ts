import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BookOrder from '@/models/BookOrder';
import User from '@/models/User';
import { getLuluPrintJobStatus } from '@/lib/lulu';
import { sendOrderShippedEmail } from '@/lib/email';

// Maps Lulu status names → our internal status
function mapLuluStatus(
  luluStatus: string
): 'in_production' | 'shipped' | 'delivered' | 'cancelled' | 'error' | null {
  const s = luluStatus.toUpperCase();
  if (['CREATED', 'UNPAID', 'PAYMENT_IN_PROGRESS', 'PRODUCTION_READY', 'IN_PRODUCTION', 'PRODUCTION_DELAYED'].includes(s))
    return 'in_production';
  if (s === 'SHIPPED') return 'shipped';
  if (s === 'DELIVERED') return 'delivered';
  if (['REJECTED', 'CANCELLED', 'UNPRINTABLE'].includes(s)) return 'cancelled';
  if (s === 'ERROR') return 'error';
  return null; // unknown / no change
}

export async function GET(req: NextRequest) {
  // Protect with a secret to prevent unauthorized calls
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  // Fetch all active orders that have a Lulu job ID
  const orders = await BookOrder.find({
    luluJobId: { $exists: true, $ne: null },
    status: { $in: ['paid', 'in_production'] },
  }).lean();

  const results = { checked: 0, updated: 0, errors: 0 };

  for (const order of orders) {
    results.checked++;
    try {
      const luluData = await getLuluPrintJobStatus(order.luluJobId!);
      const newStatus = mapLuluStatus(luluData.status);

      if (!newStatus || newStatus === order.status) continue;

      // Build update payload
      const update: Record<string, unknown> = {
        status: newStatus,
        ...(luluData.trackingUrl && { trackingUrl: luluData.trackingUrl }),
        ...(luluData.trackingNumber && { trackingNumber: luluData.trackingNumber }),
        ...(luluData.carrier && { carrier: luluData.carrier }),
        ...(newStatus === 'shipped' && { shippedAt: new Date() }),
      };

      await BookOrder.findByIdAndUpdate(order._id, update);
      results.updated++;

      // Send email notification when shipped
      if (newStatus === 'shipped') {
        try {
          const user = await User.findById(order.userId).select('email').lean();
          if (user?.email) {
            await sendOrderShippedEmail({
              to: user.email,
              childName: order.childName,
              storyTitle: order.storyTitle,
              carrier: luluData.carrier,
              trackingNumber: luluData.trackingNumber,
              trackingUrl: luluData.trackingUrl,
            });
          }
        } catch (emailErr) {
          console.error(`[cron] Email failed for order ${order._id}:`, emailErr);
          // Non-fatal: status was already updated
        }
      }
    } catch (err) {
      results.errors++;
      console.error(`[cron] Failed to sync order ${order._id}:`, err);
    }
  }

  console.log(`[cron/sync-lulu-orders] ${JSON.stringify(results)}`);
  return NextResponse.json(results);
}
