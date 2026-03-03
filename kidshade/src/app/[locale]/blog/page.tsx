import { useTranslations } from 'next-intl';
import { BookOpen, Bell } from 'lucide-react';

export default function BlogPage() {
  const t = useTranslations('blog');

  return (
    <div className="min-h-screen gradient-warm py-16">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-gray-500">{t('subtitle')}</p>
        </div>

        {/* Coming soon card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center mb-8">
          <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('comingSoon')}</h2>
          <p className="text-gray-500 max-w-md mx-auto leading-relaxed">{t('comingSoonBody')}</p>
        </div>

        {/* Notify */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{t('notifyTitle')}</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4">{t('notifyBody')}</p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex gap-3"
          >
            <input
              type="email"
              placeholder={t('notifyPlaceholder')}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-all"
            >
              {t('notifyButton')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
