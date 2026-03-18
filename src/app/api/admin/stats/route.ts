import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import BookOrder from '@/models/BookOrder';
import Story from '@/models/Story';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectToDatabase();

  const [
    totalUsers,
    premiumUsers,
    superpremiumUsers,
    totalStories,
    totalOrders,
    paidOrders,
    shippedOrders,
    revenueResult,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ plan: 'premium' }),
    User.countDocuments({ plan: 'superpremium' }),
    Story.countDocuments(),
    BookOrder.countDocuments(),
    BookOrder.countDocuments({ status: { $in: ['paid', 'in_production', 'shipped', 'delivered'] } }),
    BookOrder.countDocuments({ status: 'shipped' }),
    BookOrder.aggregate([
      { $match: { status: { $in: ['paid', 'in_production', 'shipped', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]),
  ]);

  const recentOrders = await BookOrder.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('userId', 'name email')
    .lean();

  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email plan createdAt')
    .lean();

  return NextResponse.json({
    users: {
      total: totalUsers,
      free: totalUsers - premiumUsers - superpremiumUsers,
      premium: premiumUsers,
      superpremium: superpremiumUsers,
    },
    stories: { total: totalStories },
    orders: {
      total: totalOrders,
      paid: paidOrders,
      shipped: shippedOrders,
      revenue: revenueResult[0]?.total || 0,
    },
    recentOrders,
    recentUsers,
  });
}
