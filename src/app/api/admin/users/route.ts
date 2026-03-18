import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

// GET /api/admin/users?page=1&search=email&plan=premium
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const search = searchParams.get('search') || '';
  const planFilter = searchParams.get('plan') || '';

  const query: Record<string, unknown> = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (planFilter && planFilter !== 'all') {
    query.plan = planFilter;
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
}

// PUT /api/admin/users — update plan or role
export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectToDatabase();

  const { userId, plan, role, disabled } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (plan !== undefined) update.plan = plan;
  if (role !== undefined) update.role = role;
  // "disabled" is represented by role: 'disabled' or we can just track it via role
  if (disabled !== undefined) update.role = disabled ? 'disabled' : 'user';

  const user = await User.findByIdAndUpdate(userId, update, { new: true }).select('-password');
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ user });
}
