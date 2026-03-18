import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { connectToDatabase } from './mongodb';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const userId = (session.user as { id: string }).id;
  await connectToDatabase();
  const user = await User.findById(userId);

  if (!user || user.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user };
}
