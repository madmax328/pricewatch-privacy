import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { connectToDatabase } from '@/lib/mongodb';
import BookOrder from '@/models/BookOrder';
import Story from '@/models/Story';
import User from '@/models/User';
import { generateInteriorPdf, generateCoverPdf } from '@/lib/pdf-generator';
import { createLuluPrintJob } from '@/lib/lulu';
import { put } from '@vercel/blob';

// Increase max duration for Vercel (PDF generation + Lulu API can take time)
export const maxDuration = 60;

// POST /api/admin/orders/retry-lulu  { orderId }
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectToDatabase();

  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const order = await BookOrder.findById(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const [user, story] = await Promise.all([
    User.findById(order.userId),
    Story.findById(order.storyId),
  ]);

  if (!user || !story) return NextResponse.json({ error: 'User or story not found' }, { status: 404 });

  // Mongoose Map → plain object
  const illustrationUrlsObj: Record<number, string> = {};
  if (story.illustrationUrls) {
    (story.illustrationUrls as Map<string, string>).forEach((url, key) => {
      const idx = parseInt(key);
      if (!isNaN(idx)) illustrationUrlsObj[idx] = url;
    });
  }

  const coverIllustrationUrl = illustrationUrlsObj?.[0];

  try {
    const [interiorBytes, coverBytes] = await Promise.all([
      generateInteriorPdf({
        childName: story.childName,
        storyTitle: story.title,
        storyContent: story.content,
        theme: story.theme || 'space',
        illustrationUrls: illustrationUrlsObj,
        loyaltyPromoCode: order.loyaltyPromoCode,
      }),
      generateCoverPdf({
        childName: story.childName,
        storyTitle: story.title,
        theme: story.theme || 'space',
        coverIllustrationUrl,
      }),
    ]);

    const [interiorBlob, coverBlob] = await Promise.all([
      put(`lulu/${orderId}/interior.pdf`, Buffer.from(interiorBytes), { access: 'public', contentType: 'application/pdf' }),
      put(`lulu/${orderId}/cover.pdf`, Buffer.from(coverBytes), { access: 'public', contentType: 'application/pdf' }),
    ]);

    const { luluJobId, luluOrderId } = await createLuluPrintJob({
      orderId,
      userEmail: user.email,
      storyTitle: story.title,
      coverUrl: coverBlob.url,
      interiorUrl: interiorBlob.url,
      address: order.deliveryAddress,
    });

    await BookOrder.findByIdAndUpdate(orderId, { luluJobId, luluOrderId, status: 'in_production' });

    return NextResponse.json({ ok: true, luluJobId, luluOrderId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Lulu] Retry failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
