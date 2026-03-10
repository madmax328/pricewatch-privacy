'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';
import { THEMES } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

const AGES = Array.from({ length: 13 }, (_, i) => i + 2); // 2 to 14

const HAIR_OPTIONS = [
  { value: 'blonde', label: 'Blond', color: '#F5D060' },
  { value: 'brown', label: 'Châtain', color: '#8B5E3C' },
  { value: 'black', label: 'Noir', color: '#1C1C1C' },
  { value: 'red', label: 'Roux', color: '#C0392B' },
  { value: 'white', label: 'Blanc', color: '#E8E8E8' },
];

const SKIN_OPTIONS = [
  { value: 'fair', label: 'Très clair', color: '#FDDBB4' },
  { value: 'light', label: 'Clair', color: '#F1C27D' },
  { value: 'medium', label: 'Moyen', color: '#C68642' },
  { value: 'tan', label: 'Hâlé', color: '#8D5524' },
  { value: 'dark', label: 'Foncé', color: '#3D1F00' },
];

export default function StoryGenerator({
  storiesLeft,
  isPremium,
}: {
  storiesLeft?: number;
  isPremium?: boolean;
}) {
  const t = useTranslations('generator');
  const tc = useTranslations('common');
  const { data: session } = useSession();
  const locale = useLocale();
  const router = useRouter();

  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState(5);
  const [theme, setTheme] = useState('dragons');
  const [language, setLanguage] = useState(locale);
  const [loading, setLoading] = useState(false);

  // Avatar
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [hair, setHair] = useState('brown');
  const [skin, setSkin] = useState('light');

  const themes = THEMES[locale as keyof typeof THEMES] || THEMES.fr;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      router.push(`/${locale}/auth/signin`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName,
          childAge,
          theme,
          language,
          childAvatar: { gender, hair, skin },
        }),
      });

      let data: { code?: string; error?: string; story?: { _id: string } } = {};
      try {
        data = await res.json();
      } catch {
        toast.error('Erreur serveur — consultez les logs Vercel.');
        return;
      }

      if (!res.ok) {
        if (data.code === 'LIMIT_REACHED') {
          toast.error(t('limitReached'));
          router.push(`/${locale}/pricing`);
          return;
        }
        toast.error(data.error || tc('error'));
        return;
      }

      toast.success('✨ Histoire créée !');
      router.push(`/${locale}/story/${data.story!._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc('error'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-purple-100 p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
        <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        {session && storiesLeft !== undefined && !isPremium && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-sm text-orange-700">
            <span className="font-semibold">{storiesLeft}</span>
            <span>{t('freeLeft')}</span>
          </div>
        )}
        {isPremium && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-sm text-purple-700">
            <Sparkles className="w-3 h-3" />
            <span className="font-semibold">Premium</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Child name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('childName')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder={t('childNamePlaceholder')}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
          />
        </div>

        {/* Age + Theme row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('childAge')} <span className="text-red-400">*</span>
            </label>
            <select
              value={childAge}
              onChange={(e) => setChildAge(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
            >
              {AGES.map((age) => (
                <option key={age} value={age}>{age} ans</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('theme')} <span className="text-red-400">*</span>
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
            >
              {themes.map((th) => (
                <option key={th.value} value={th.value}>{th.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('language')}
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
          >
            <option value="fr">🇫🇷 Français</option>
            <option value="en">🇬🇧 English</option>
            <option value="es">🇪🇸 Español</option>
            <option value="pt">🇧🇷 Português</option>
            <option value="de">🇩🇪 Deutsch</option>
          </select>
        </div>

        {/* Avatar section */}
        <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/40 space-y-4">
          <p className="text-sm font-semibold text-purple-800">🧒 {t('avatarTitle')}</p>

          {/* Gender */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">{t('avatarGender')}</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGender('boy')}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  gender === 'boy'
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                👦 {t('avatarBoy')}
              </button>
              <button
                type="button"
                onClick={() => setGender('girl')}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  gender === 'girl'
                    ? 'border-pink-400 bg-pink-50 text-pink-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                👧 {t('avatarGirl')}
              </button>
            </div>
          </div>

          {/* Hair color */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">{t('avatarHair')}</label>
            <div className="flex gap-2 flex-wrap">
              {HAIR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setHair(opt.value)}
                  title={opt.label}
                  className={`w-9 h-9 rounded-full border-4 transition-all ${
                    hair === opt.value ? 'border-purple-500 scale-110' : 'border-white shadow-md hover:scale-105'
                  }`}
                  style={{ backgroundColor: opt.color }}
                />
              ))}
              <span className="text-xs text-gray-400 self-center ml-1">
                {HAIR_OPTIONS.find(o => o.value === hair)?.label}
              </span>
            </div>
          </div>

          {/* Skin tone */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">{t('avatarSkin')}</label>
            <div className="flex gap-2 flex-wrap">
              {SKIN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSkin(opt.value)}
                  title={opt.label}
                  className={`w-9 h-9 rounded-full border-4 transition-all ${
                    skin === opt.value ? 'border-purple-500 scale-110' : 'border-white shadow-md hover:scale-105'
                  }`}
                  style={{ backgroundColor: opt.color }}
                />
              ))}
              <span className="text-xs text-gray-400 self-center ml-1">
                {SKIN_OPTIONS.find(o => o.value === skin)?.label}
              </span>
            </div>
          </div>

          {/* Avatar preview text */}
          <p className="text-xs text-purple-600 italic">
            ✨ {t('avatarPreview')}
          </p>
        </div>

        {/* Submit */}
        {session ? (
          <button
            type="submit"
            disabled={loading || !childName.trim()}
            className="w-full py-4 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('generating')}
              </>
            ) : (
              t('submit')
            )}
          </button>
        ) : (
          <Link
            href={`/${locale}/auth/signin`}
            className="w-full py-4 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 transition-all flex items-center justify-center gap-2 text-base"
          >
            <Sparkles className="w-5 h-5" />
            {t('loginRequired')}
          </Link>
        )}
      </form>
    </div>
  );
}
