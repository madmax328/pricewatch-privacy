'use client';

import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Check, Sparkles, Crown, BookOpen, Zap } from 'lucide-react';
import { PLANS } from '@/lib/stripe';
import { cn } from '@/lib/utils';

export default function PricingPage() {
  const { data: session } = useSession();
  const locale = useLocale();
  const t = useTranslations('pricing');

  const planFeatures = (plan: 'free' | 'premium') => {
    const features = PLANS[plan].features as Record<string, readonly string[]>;
    return features[locale] || features.fr;
  };

  const handleSubscribe = async () => {
    if (!session) {
      window.location.href = `/${locale}/auth/signin?next=pricing`;
      return;
    }
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'subscription' }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const handleBookOrder = async () => {
    if (!session) {
      window.location.href = `/${locale}/auth/signin?next=pricing`;
      return;
    }
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'book' }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  return (
    <div className="min-h-screen gradient-warm py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-purple-100 rounded-full text-sm font-medium text-purple-700 shadow-sm mb-6">
            <Zap className="w-4 h-4 text-purple-500" />
            {t('badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            {t('title')}
          </h1>
          <p className="text-xl text-gray-500">{t('subtitle')}</p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* FREE */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <div className="mb-6">
              <Sparkles className="w-8 h-8 text-gray-400 mb-3" />
              <h2 className="text-xl font-bold text-gray-900">{t('free.name')}</h2>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-4xl font-extrabold text-gray-900">{t('free.price')}</span>
                <span className="text-gray-400 mb-1">{t('monthly')}</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {planFeatures('free').map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {feat}
                </li>
              ))}
            </ul>
            {session ? (
              <Link
                href={`/${locale}/generate`}
                className="block w-full py-3 rounded-xl text-center font-semibold border-2 border-gray-200 text-gray-700 hover:border-purple-200 hover:text-purple-700 transition-colors"
              >
                {t('free.cta')}
              </Link>
            ) : (
              <Link
                href={`/${locale}/auth/signup`}
                className="block w-full py-3 rounded-xl text-center font-semibold border-2 border-gray-200 text-gray-700 hover:border-purple-200 hover:text-purple-700 transition-colors"
              >
                {t('free.cta')}
              </Link>
            )}
          </div>

          {/* PREMIUM */}
          <div className="relative bg-white rounded-3xl border-2 border-purple-400 shadow-xl p-8">
            {/* Popular badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="whitespace-nowrap px-4 py-1.5 rounded-full gradient-primary text-white text-xs font-bold shadow-lg">
                ⭐ {t('premium.popular')}
              </span>
            </div>

            <div className="mb-6">
              <Crown className="w-8 h-8 text-yellow-500 mb-3" />
              <h2 className="text-xl font-bold text-gray-900">{t('premium.name')}</h2>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-4xl font-extrabold gradient-text">{t('premium.price')}</span>
                <span className="text-gray-400 mb-1">{t('monthly')}</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {planFeatures('premium').map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-4 h-4 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                  {feat}
                </li>
              ))}
            </ul>
            <button
              onClick={handleSubscribe}
              className="w-full py-3 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 transition-opacity shadow-lg shadow-purple-200"
            >
              {t('premium.cta')}
            </button>
          </div>

          {/* BOOK */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <div className="mb-6">
              <BookOpen className="w-8 h-8 text-orange-500 mb-3" />
              <h2 className="text-xl font-bold text-gray-900">{t('book.name')}</h2>
              <div className="mt-3">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">{t('book.price')}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{t('book.desc')}</p>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {([1, 2, 3, 4, 5] as const).map((i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  {t(`book.f${i}`)}
                </li>
              ))}
            </ul>
            <button
              onClick={handleBookOrder}
              className="w-full py-3 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-100"
            >
              {t('book.cta')}
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">{t('faqTitle')}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {([1, 2, 3, 4] as const).map((i) => (
              <div key={i} className="border-b border-gray-100 pb-4 last:border-0">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">{t(`faq${i}q`)}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{t(`faq${i}a`)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
