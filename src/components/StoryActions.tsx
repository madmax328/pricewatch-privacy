'use client';

import Link from 'next/link';
import { Sparkles, Printer } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import toast from 'react-hot-toast';

export default function StoryActions({
  storyId,
}: {
  locale?: string;
  storyId: string;
}) {
  const t = useTranslations('story');
  const locale = useLocale();

  const handleOrderBook = async () => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'book', storyId }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error(data.error || t('orderError'));
    }
  };

  return (
    <div className="mt-8 grid sm:grid-cols-2 gap-4">
      <Link
        href={`/${locale}/generate`}
        className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-purple-200 text-purple-700 font-semibold hover:bg-purple-50 transition-colors"
      >
        <Sparkles className="w-5 h-5" />
        {t('newStory')}
      </Link>
      <button
        onClick={handleOrderBook}
        className="flex items-center justify-center gap-2 py-4 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity"
      >
        <Printer className="w-5 h-5" />
        {t('orderBook')}
      </button>
    </div>
  );
}
