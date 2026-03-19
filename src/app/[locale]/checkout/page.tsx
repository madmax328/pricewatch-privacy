'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { BookOpen, Crown, Zap, ArrowLeft, Tag, X } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PLAN_META = {
  premium: { label: 'Premium', icon: Crown, color: 'text-yellow-500', price: '2,99€/mois', baseCents: 299, isSubscription: true },
  superpremium: { label: 'Super Premium', icon: Zap, color: 'text-purple-600', price: '5,99€/mois', baseCents: 599, isSubscription: true },
  book: { label: 'Livre Physique', icon: BookOpen, color: 'text-orange-500', price: '29,99€', baseCents: 2999, isSubscription: false },
};

function formatPrice(cents: number, isSubscription: boolean) {
  return (cents / 100).toFixed(2).replace('.', ',') + '€' + (isSubscription ? '/mois' : '');
}

function calcTotal(baseCents: number, discountType: string | null, discountValue: number) {
  if (!discountType) return baseCents;
  if (discountType === 'percent') return Math.round(baseCents * (1 - discountValue / 100));
  return Math.max(0, baseCents - discountValue);
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const router = useRouter();

  const type = searchParams.get('type') as 'premium' | 'superpremium' | 'book' | null;
  const storyId = searchParams.get('storyId');
  const initialPromo = searchParams.get('promoCode') || '';

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [promoInput, setPromoInput] = useState(initialPromo);
  const [appliedPromo, setAppliedPromo] = useState(initialPromo);
  const [promoDiscount, setPromoDiscount] = useState<string | null>(null);
  const [promoDiscountType, setPromoDiscountType] = useState<string | null>(null);
  const [promoDiscountValue, setPromoDiscountValue] = useState<number>(0);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const fetchClientSecret = useCallback(async (promo: string) => {
    if (!type) return;
    setClientSecret(null);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, storyId, promoCode: promo || undefined, embedded: true, locale }),
      });
      const data = await res.json();
      if (data.error) {
        if (data.error === 'delivery_address_missing') {
          router.push(`/${locale}/account?tab=address&next=checkout&type=${type}&storyId=${storyId}`);
          return;
        }
        setError(data.error);
        return;
      }
      setClientSecret(data.clientSecret);
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    }
  }, [type, storyId, locale, router]);

  useEffect(() => {
    fetchClientSecret(appliedPromo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);

    const promoType = type === 'book' ? 'book' : 'subscription';
    const res = await fetch('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, type: promoType }),
    });
    const data = await res.json();
    setPromoLoading(false);

    if (!data.valid) {
      setPromoError(data.error || 'Code invalide');
      return;
    }

    setAppliedPromo(code);
    setPromoDiscount(data.discountText);
    setPromoDiscountType(data.discountType);
    setPromoDiscountValue(data.discountValue);
    await fetchClientSecret(code);
  };

  const handleRemovePromo = async () => {
    setAppliedPromo('');
    setPromoDiscount(null);
    setPromoDiscountType(null);
    setPromoDiscountValue(0);
    setPromoInput('');
    setPromoError(null);
    await fetchClientSecret('');
  };

  if (!type || !(type in PLAN_META)) {
    return (
      <div className="text-center py-20 text-gray-500">
        Type de commande invalide.{' '}
        <Link href={`/${locale}/pricing`} className="text-purple-600 underline">Retour aux tarifs</Link>
      </div>
    );
  }

  const meta = PLAN_META[type];
  const Icon = meta.icon;
  const totalCents = calcTotal(meta.baseCents, promoDiscountType, promoDiscountValue);
  const totalLabel = formatPrice(totalCents, meta.isSubscription);

  return (
    <div className="min-h-screen gradient-warm">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link
          href={storyId ? `/${locale}/story/${storyId}` : `/${locale}/pricing`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>

        <div className="grid lg:grid-cols-[1fr_2fr] gap-8 items-start">
          {/* Order summary */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Récapitulatif</h2>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gray-50">
                <Icon className={`w-6 h-6 ${meta.color}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{meta.label}</p>
                <p className="text-2xl font-extrabold text-gray-900">{meta.price}</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2 mb-5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Sous-total</span>
                <span>{meta.price}</span>
              </div>
              {promoDiscount && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Code promo ({appliedPromo})</span>
                  <span>{promoDiscount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span className={promoDiscountType ? 'text-green-600' : ''}>{totalLabel}</span>
              </div>
            </div>

            {/* Promo code input */}
            {appliedPromo && promoDiscount ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                  <Tag className="w-4 h-4" />
                  {appliedPromo}
                </div>
                <button onClick={handleRemovePromo} className="text-green-600 hover:text-green-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                    placeholder="Code promo"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <button
                    onClick={handleApplyPromo}
                    disabled={!promoInput.trim() || promoLoading}
                    className="px-3 py-2 text-sm font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {promoLoading ? '…' : 'Appliquer'}
                  </button>
                </div>
                {promoError && <p className="text-xs text-red-500">{promoError}</p>}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4 text-center">
              Paiement sécurisé par Stripe 🔒
            </p>
          </div>

          {/* Stripe Embedded Checkout */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex items-center justify-center">
            {error ? (
              <div className="p-8 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                  onClick={() => fetchClientSecret(appliedPromo)}
                  className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold"
                >
                  Réessayer
                </button>
              </div>
            ) : !clientSecret ? (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-sm">Chargement du paiement…</p>
              </div>
            ) : (
              <div className="w-full">
                <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
