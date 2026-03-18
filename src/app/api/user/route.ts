import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { stripe } from '@/lib/stripe';
import User from '@/models/User';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const userId = (session.user as { id: string }).id;
  const user = await User.findById(userId).select('-password');

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const { name, deliveryAddress } = body;

  const updates: Record<string, unknown> = {};
  if (name && typeof name === 'string') updates.name = name.trim();
  if (deliveryAddress && typeof deliveryAddress === 'object') updates.deliveryAddress = deliveryAddress;

  const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ user });
}

// DELETE → cancel subscription
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const userId = (session.user as { id: string }).id;
  const user = await User.findById(userId);

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!user.stripeSubscriptionId) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
  }

  // Cancel at period end (user keeps access until expiry)
  await stripe.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  return NextResponse.json({ success: true });
}
