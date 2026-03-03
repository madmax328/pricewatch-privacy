import { useTranslations } from 'next-intl';

export default function TermsPage() {
  const t = useTranslations('terms');

  const sections = [
    { title: t('s1title'), body: t('s1body') },
    { title: t('s2title'), body: t('s2body') },
    { title: t('s3title'), body: t('s3body') },
    { title: t('s4title'), body: t('s4body') },
    { title: t('s5title'), body: t('s5body') },
    { title: t('s6title'), body: t('s6body') },
    { title: t('s7title'), body: t('s7body') },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{t('title')}</h1>
      <p className="text-gray-400 text-sm mb-6">{t('updated')} : {new Date().toLocaleDateString()}</p>
      <p className="text-gray-600 mb-10 leading-relaxed">{t('intro')}</p>

      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h2>
            <p className="text-gray-600 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
