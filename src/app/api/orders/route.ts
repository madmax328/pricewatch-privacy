import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import BookOrder from '@/models/BookOrder';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  await connectToDatabase();

  const orders = await BookOrder.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ orders });
}
