import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { connectToDatabase } from '@/lib/mongodb';
import BookOrder from '@/models/BookOrder';

// GET /api/admin/orders?page=1&status=paid
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const statusFilter = searchParams.get('status') || '';

  const query: Record<string, unknown> = {};
  if (statusFilter && statusFilter !== 'all') {
    query.status = statusFilter;
  }

  const [orders, total] = await Promise.all([
    BookOrder.find(query)
      .populate('userId', 'name email')
      .populate('storyId', 'title childName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    BookOrder.countDocuments(query),
  ]);

  return NextResponse.json({ orders, total, page, pages: Math.ceil(total / limit) });
}

// PUT /api/admin/orders — update status, tracking info
export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectToDatabase();

  const { orderId, status, trackingUrl, trackingNumber, carrier } = await req.json();
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (status !== undefined) update.status = status;
  if (trackingUrl !== undefined) update.trackingUrl = trackingUrl;
  if (trackingNumber !== undefined) update.trackingNumber = trackingNumber;
  if (carrier !== undefined) update.carrier = carrier;
  if (status === 'shipped') update.shippedAt = new Date();

  const order = await BookOrder.findByIdAndUpdate(orderId, update, { new: true })
    .populate('userId', 'name email')
    .populate('storyId', 'title childName');

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  return NextResponse.json({ order });
}
