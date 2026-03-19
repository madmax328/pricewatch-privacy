'use client';

import Link from 'next/link';
import { Sparkles, Printer } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

export default function StoryActions({
  storyId,
}: {
  locale?: string;
  storyId: string;
}) {
  const t = useTranslations('story');
  const locale = useLocale();

  return (
    <div className="mt-8 grid sm:grid-cols-2 gap-4">
      <Link
        href={`/${locale}/generate`}
        className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-purple-200 text-purple-700 font-semibold hover:bg-purple-50 transition-colors"
      >
        <Sparkles className="w-5 h-5" />
        {t('newStory')}
      </Link>
      <Link
        href={`/${locale}/checkout?type=book&storyId=${storyId}`}
        className="flex items-center justify-center gap-2 py-4 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity"
      >
        <Printer className="w-5 h-5" />
        {t('orderBook')}
      </Link>
    </div>
  );
}
