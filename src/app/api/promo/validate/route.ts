import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import PromoCode from '@/models/PromoCode';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code, type } = await req.json();
  if (!code) return NextResponse.json({ valid: false, error: 'Code manquant' });

  await connectToDatabase();
  const promo = await PromoCode.findOne({ code: code.toUpperCase().trim(), active: true });

  if (!promo) return NextResponse.json({ valid: false, error: 'Code promo invalide' });
  if (promo.expiresAt && new Date() > promo.expiresAt)
    return NextResponse.json({ valid: false, error: 'Code promo expiré' });
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses)
    return NextResponse.json({ valid: false, error: 'Code promo épuisé' });
  if (type && promo.appliesTo !== 'all' && promo.appliesTo !== type)
    return NextResponse.json({ valid: false, error: 'Code promo non applicable à ce produit' });

  const discountText =
    promo.discountType === 'percent'
      ? `-${promo.discountValue}%`
      : `-${(promo.discountValue / 100).toFixed(2).replace('.', ',')}€`;

  return NextResponse.json({ valid: true, discountText, discountType: promo.discountType, discountValue: promo.discountValue });
}
