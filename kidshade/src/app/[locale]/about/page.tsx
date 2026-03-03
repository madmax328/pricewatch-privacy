import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Sparkles, Shield, Globe, Zap, Users } from 'lucide-react';

export default function AboutPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('about');

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-warm py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-purple-100 rounded-full text-sm font-medium text-purple-700 shadow-sm mb-8">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Kidshade
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6">{t('title')}</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-16 space-y-20">
        {/* Mission */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4">{t('missionTitle')}</h2>
            <p className="text-gray-600 leading-relaxed text-lg">{t('missionBody')}</p>
          </div>
          <div className="bg-purple-50 rounded-3xl p-8 flex items-center justify-center">
            <span className="text-8xl">✨</span>
          </div>
        </section>

        {/* Story */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div className="bg-orange-50 rounded-3xl p-8 flex items-center justify-center order-last md:order-first">
            <span className="text-8xl">📖</span>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4">{t('storyTitle')}</h2>
            <p className="text-gray-600 leading-relaxed text-lg">{t('storyBody')}</p>
          </div>
        </section>

        {/* Values */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-8 text-center">{t('valuesTitle')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, titleKey: 'value1Title', bodyKey: 'value1Body', color: 'bg-teal-50 text-teal-600' },
              { icon: Globe, titleKey: 'value2Title', bodyKey: 'value2Body', color: 'bg-blue-50 text-blue-600' },
              { icon: Zap, titleKey: 'value3Title', bodyKey: 'value3Body', color: 'bg-purple-50 text-purple-600' },
            ].map((v) => (
              <div key={v.titleKey} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className={`w-12 h-12 rounded-xl ${v.color} flex items-center justify-center mb-4`}>
                  <v.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{t(v.titleKey)}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{t(v.bodyKey)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="bg-gray-50 rounded-3xl p-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-4">{t('teamTitle')}</h2>
          <p className="text-gray-600 max-w-xl mx-auto leading-relaxed">{t('teamBody')}</p>
        </section>

        {/* CTA */}
        <section className="gradient-primary rounded-3xl p-12 text-center">
          <h2 className="text-2xl font-extrabold text-white mb-4">{t('ctaTitle')}</h2>
          <p className="text-purple-100 mb-8">{t('ctaBody')}</p>
          <Link
            href={`/${locale}/auth/signup`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-purple-700 font-bold hover:bg-purple-50 transition-colors shadow-lg"
          >
            <Sparkles className="w-5 h-5" />
            {t('ctaButton')}
          </Link>
        </section>
      </div>
    </div>
  );
}
