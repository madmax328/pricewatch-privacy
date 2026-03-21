import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

export default function Footer({ locale }: { locale: string }) {
  const t = useTranslations('footer');

  return (
    <footer className="bg-gray-950 text-gray-400 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </span>
              <span className="text-white font-bold text-xl">Kidshade</span>
            </div>
            <p className="text-sm leading-relaxed">{t('tagline')}</p>
            <div className="flex gap-3 mt-4">
              {['🇫🇷', '🇬🇧', '🇪🇸', '🇧🇷', '🇩🇪'].map((flag, i) => (
                <span key={i} className="text-xl">{flag}</span>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm">{t('product')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href={`/${locale}/generate`} className="hover:text-white transition-colors">{t('links.generate')}</Link></li>
              <li><Link href={`/${locale}/pricing`} className="hover:text-white transition-colors">{t('links.pricing')}</Link></li>
              <li><Link href={`/${locale}/dashboard`} className="hover:text-white transition-colors">{t('links.dashboard')}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm">{t('company')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href={`/${locale}/about`} className="hover:text-white transition-colors">{t('links.about')}</Link></li>
              <li><Link href={`/${locale}/contact`} className="hover:text-white transition-colors">{t('links.contact')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm">{t('legal')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">{t('links.privacy')}</Link></li>
              <li><Link href={`/${locale}/terms`} className="hover:text-white transition-colors">{t('links.terms')}</Link></li>
              <li><Link href={`/${locale}/cookies`} className="hover:text-white transition-colors">{t('links.cookies')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">
            © {new Date().getFullYear()} Kidshade. {t('rights')}
          </p>
          <div className="flex items-center gap-1 text-sm">
            <span>Made with</span>
            <span className="text-red-400">♥</span>
            <span>& AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
