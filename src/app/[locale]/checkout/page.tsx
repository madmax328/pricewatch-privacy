'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { BookOpen, Crown, Zap, ArrowLeft } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PLAN_META = {
  premium: { label: 'Premium', icon: Crown, color: 'text-yellow-500', price: '2,99€/mois' },
  superpremium: { label: 'Super Premium', icon: Zap, color: 'text-purple-600', price: '5,99€/mois' },
  book: { label: 'Livre Physique', icon: BookOpen, color: 'text-orange-500', price: '29,99€' },
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const router = useRouter();

  const type = searchParams.get('type') as 'premium' | 'superpremium' | 'book' | null;
  const storyId = searchParams.get('storyId');
  const promoCode = searchParams.get('promoCode');

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    if (!type) return;
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, storyId, promoCode, embedded: true, locale }),
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
  }, [type, storyId, promoCode, locale, router]);

  useEffect(() => {
    fetchClientSecret();
  }, [fetchClientSecret]);

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
              <div className={`p-2 rounded-xl bg-gray-50`}>
                <Icon className={`w-6 h-6 ${meta.color}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{meta.label}</p>
                <p className="text-2xl font-extrabold text-gray-900">{meta.price}</p>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Sous-total</span>
                <span>{meta.price}</span>
              </div>
              {promoCode && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Code promo ({promoCode})</span>
                  <span>appliqué</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{meta.price}</span>
              </div>
            </div>
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
                  onClick={fetchClientSecret}
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
