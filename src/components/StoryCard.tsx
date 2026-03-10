import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { BookOpen, Clock, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface StoryCardProps {
  story: {
    _id: string;
    title: string;
    childName: string;
    childAge: number;
    theme: string;
    language: string;
    content: string;
    createdAt: string;
  };
  onDelete?: (id: string) => void;
}

const THEME_EMOJIS: Record<string, string> = {
  dragons: '🐉', space: '🚀', forest: '🌲', ocean: '🌊',
  princess: '👸', dinosaurs: '🦕', superheroes: '🦸',
  animals: '🐾', pirates: '🏴‍☠️', fairies: '🧚',
};

export default function StoryCard({ story, onDelete }: StoryCardProps) {
  const locale = useLocale();
  const t = useTranslations('story');

  const wordCount = story.content.split(' ').length;
  const readingTime = Math.ceil(wordCount / 150);
  const excerpt = story.content.replace(/\n/g, ' ').slice(0, 120) + '...';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm card-hover overflow-hidden group">
      {/* Color header by theme */}
      <div className="h-2 gradient-primary" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{THEME_EMOJIS[story.theme] || '📖'}</span>
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">
                {story.title}
              </h3>
              <p className="text-xs text-purple-600 font-medium mt-0.5">
                {t('for')} {story.childName}, {story.childAge} {t('age')}
              </p>
            </div>
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(story._id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 line-clamp-2 mb-4">{excerpt}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readingTime} {t('readTime')}
            </span>
            <span>{formatDate(story.createdAt, locale)}</span>
          </div>
          <Link
            href={`/${locale}/story/${story._id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            {t('read')}
          </Link>
        </div>
      </div>
    </div>
  );
}
