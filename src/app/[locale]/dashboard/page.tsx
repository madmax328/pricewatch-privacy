'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Sparkles, Crown, Plus, Zap, User } from 'lucide-react';
import StoryCard from '@/components/StoryCard';
import toast from 'react-hot-toast';

interface Story {
  _id: string;
  title: string;
  childName: string;
  childAge: number;
  theme: string;
  language: string;
  content: string;
  createdAt: string;
}

interface UserData {
  name: string;
  plan: 'free' | 'premium' | 'superpremium';
  storiesUsedThisMonth: number;
  storiesCreatedToday: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const locale = useLocale();
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');

  const [stories, setStories] = useState<Story[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = `/${locale}/auth/signin`;
      return;
    }
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const [storiesRes, userRes] = await Promise.all([
        fetch('/api/stories'),
        fetch('/api/user'),
      ]);
      const storiesData = await storiesRes.json();
      const userData = await userRes.json();
      setStories(storiesData.stories || []);
      setUser(userData.user);
    } catch {
      toast.error(t('loadingError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      await fetch(`/api/stories/${id}`, { method: 'DELETE' });
      setStories((prev) => prev.filter((s) => s._id !== id));
      toast.success(t('deleteSuccess'));
    } catch {
      toast.error(t('deleteError'));
    }
  };

  const handleUpgrade = () => {
    window.location.href = `/${locale}/pricing`;
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full gradient-primary animate-spin mx-auto mb-4 border-4 border-purple-200" />
          <p className="text-gray-500">{tc('loading')}</p>
        </div>
      </div>
    );
  }

  const plan = user?.plan || 'free';
  const storiesLeft = Math.max(0, 3 - (user?.storiesUsedThisMonth || 0));
  const storiesTodayLeft = Math.max(0, 1 - (user?.storiesCreatedToday || 0));

  const planIcon = plan === 'superpremium'
    ? <Zap className="w-5 h-5 text-purple-600" />
    : plan === 'premium'
    ? <Crown className="w-5 h-5 text-yellow-500" />
    : <Sparkles className="w-5 h-5 text-purple-500" />;

  const planLabel = plan === 'superpremium'
    ? 'Super Premium'
    : plan === 'premium'
    ? 'Premium'
    : t('free');

  return (
    <div className="min-h-screen gradient-warm py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500 mt-1">
              {t('hello', { name: user?.name?.split(' ')[0] || '' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/account`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:border-purple-200 hover:text-purple-700 transition-colors"
            >
              <User className="w-4 h-4" />
              {t('account')}
            </Link>
            <Link
              href={`/${locale}/generate`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-purple-200"
            >
              <Plus className="w-4 h-4" />
              {t('newStory')}
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{t('currentPlan')}</p>
            <div className="flex items-center gap-2">
              {planIcon}
              <span className="font-bold text-gray-900">{planLabel}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            {plan === 'free' && (
              <>
                <p className="text-sm text-gray-500 mb-1">{t('storiesThisMonth')}</p>
                <p className="font-bold text-gray-900 text-xl">
                  {user?.storiesUsedThisMonth || 0}
                  <span className="text-gray-400 text-sm font-normal"> / 3</span>
                </p>
              </>
            )}
            {plan === 'premium' && (
              <>
                <p className="text-sm text-gray-500 mb-1">{t('storiesToday')}</p>
                <p className="font-bold text-gray-900 text-xl">
                  {user?.storiesCreatedToday || 0}
                  <span className="text-gray-400 text-sm font-normal"> / 1</span>
                </p>
              </>
            )}
            {plan === 'superpremium' && (
              <>
                <p className="text-sm text-gray-500 mb-1">{t('storiesThisMonth')}</p>
                <p className="font-bold text-gray-900 text-xl">{t('unlimited')}</p>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{t('storiesTotal')}</p>
            <p className="font-bold text-gray-900 text-xl">{stories.length}</p>
          </div>
        </div>

        {/* Upgrade banner for free users running low */}
        {plan === 'free' && storiesLeft <= 1 && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-lg">{t('storiesLeftBanner', { count: storiesLeft })}</p>
              <p className="text-purple-100 text-sm mt-1">{t('upgradePrompt')}</p>
            </div>
            <button
              onClick={handleUpgrade}
              className="whitespace-nowrap px-6 py-3 rounded-xl bg-white text-purple-700 font-bold hover:bg-purple-50 transition-colors shadow-lg"
            >
              {t('upgradeCta')}
            </button>
          </div>
        )}

        {/* Premium daily limit banner */}
        {plan === 'premium' && storiesTodayLeft === 0 && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-lg">{t('dailyLimitTitle')}</p>
              <p className="text-yellow-100 text-sm mt-1">{t('dailyLimitPrompt')}</p>
            </div>
            <button
              onClick={handleUpgrade}
              className="whitespace-nowrap px-6 py-3 rounded-xl bg-white text-orange-700 font-bold hover:bg-orange-50 transition-colors shadow-lg"
            >
              {t('upgradeCta')}
            </button>
          </div>
        )}

        {/* Stories grid */}
        {stories.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('empty')}</h2>
            <p className="text-gray-500 mb-6">{t('emptySubtitle')}</p>
            <Link
              href={`/${locale}/generate`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              {t('createFirst')}
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {stories.map((story) => (
              <StoryCard key={story._id} story={story} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
