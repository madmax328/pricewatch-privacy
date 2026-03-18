import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { connectToDatabase } from '@/lib/mongodb';
import PromoCode from '@/models/PromoCode';

// GET /api/admin/promo-codes
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectToDatabase();
  const codes = await PromoCode.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ codes });
}

// POST /api/admin/promo-codes — create new code
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectToDatabase();

  const { code, discountType, discountValue, appliesTo, maxUses, expiresAt } = await req.json();

  if (!code || !discountType || !discountValue) {
    return NextResponse.json({ error: 'code, discountType and discountValue required' }, { status: 400 });
  }

  try {
    const promo = await PromoCode.create({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue,
      appliesTo: appliesTo || 'all',
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
      active: true,
    });
    return NextResponse.json({ promo }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'Ce code existe déjà' }, { status: 409 });
    }
    throw err;
  }
}

// PUT /api/admin/promo-codes — toggle active or update
export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectToDatabase();

  const { promoId, active } = await req.json();
  if (!promoId) return NextResponse.json({ error: 'promoId required' }, { status: 400 });

  const promo = await PromoCode.findByIdAndUpdate(promoId, { active }, { new: true });
  if (!promo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ promo });
}

// DELETE /api/admin/promo-codes
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  await connectToDatabase();

  const { promoId } = await req.json();
  if (!promoId) return NextResponse.json({ error: 'promoId required' }, { status: 400 });

  await PromoCode.findByIdAndDelete(promoId);
  return NextResponse.json({ success: true });
}
