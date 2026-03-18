import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import PromoCode from '@/models/PromoCode';

// POST /api/promo-codes/validate
export async function POST(req: NextRequest) {
  const { code, appliesTo } = await req.json();
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  await connectToDatabase();

  const promo = await PromoCode.findOne({ code: code.toUpperCase().trim(), active: true });

  if (!promo) {
    return NextResponse.json({ valid: false, error: 'Code invalide ou expiré' });
  }

  // Check expiry
  if (promo.expiresAt && new Date() > promo.expiresAt) {
    return NextResponse.json({ valid: false, error: 'Code expiré' });
  }

  // Check max uses
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    return NextResponse.json({ valid: false, error: 'Code épuisé' });
  }

  // Check appliesTo compatibility
  if (appliesTo && promo.appliesTo !== 'all' && promo.appliesTo !== appliesTo) {
    return NextResponse.json({ valid: false, error: 'Code non applicable à ce produit' });
  }

  return NextResponse.json({
    valid: true,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    appliesTo: promo.appliesTo,
  });
}
