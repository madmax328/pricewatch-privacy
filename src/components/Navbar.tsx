'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import { Menu, X, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const FLAG_MAP: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', pt: '🇧🇷', de: '🇩🇪',
};

export default function Navbar({ locale }: { locale: string }) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: Locale) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
    setLangOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-purple-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2 font-bold text-xl">
            <span className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
            <span className="gradient-text">Kidshade</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href={`/${locale}/generate`}
              className="text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors"
            >
              {t('generate')}
            </Link>
            <Link
              href={`/${locale}/pricing`}
              className="text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors"
            >
              {t('pricing')}
            </Link>
            {session && (
              <>
                <Link
                  href={`/${locale}/dashboard`}
                  className="text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors"
                >
                  {t('dashboard')}
                </Link>
                <Link
                  href={`/${locale}/account`}
                  className="text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors"
                >
                  {t('account')}
                </Link>
                {(session.user as { role?: string })?.role === 'admin' && (
                  <Link
                    href={`/${locale}/admin`}
                    className="text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-purple-50 transition-colors"
              >
                <span>{FLAG_MAP[locale]}</span>
                <span className="uppercase">{locale}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  {locales.map((l) => (
                    <button
                      key={l}
                      onClick={() => switchLocale(l)}
                      className={cn(
                        'w-full px-4 py-2.5 text-left text-sm hover:bg-purple-50 transition-colors',
                        l === locale && 'bg-purple-50 font-semibold text-purple-600'
                      )}
                    >
                      {tc(`languages.${l}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {session ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{session.user?.name?.split(' ')[0]}</span>
                <button
                  onClick={() => signOut({ callbackUrl: `/${locale}` })}
                  className="text-sm font-medium text-gray-600 hover:text-red-500 transition-colors"
                >
                  {t('signout')}
                </button>
              </div>
            ) : (
              <>
                <Link
                  href={`/${locale}/auth/signin`}
                  className="text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors"
                >
                  {t('signin')}
                </Link>
                <Link
                  href={`/${locale}/auth/signup`}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white gradient-primary hover:opacity-90 transition-opacity"
                >
                  {t('signup')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          <Link href={`/${locale}/generate`} className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
            {t('generate')}
          </Link>
          <Link href={`/${locale}/pricing`} className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
            {t('pricing')}
          </Link>
          {session && (
            <>
              <Link href={`/${locale}/dashboard`} className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
                {t('dashboard')}
              </Link>
              <Link href={`/${locale}/account`} className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
                {t('account')}
              </Link>
              {(session.user as { role?: string })?.role === 'admin' && (
                <Link href={`/${locale}/admin`} className="block py-2 text-sm font-semibold text-purple-600" onClick={() => setMobileOpen(false)}>
                  Admin
                </Link>
              )}
            </>
          )}
          <hr className="border-gray-100" />
          <div className="flex gap-2 flex-wrap">
            {locales.map((l) => (
              <button
                key={l}
                onClick={() => { switchLocale(l); setMobileOpen(false); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm',
                  l === locale ? 'bg-purple-100 text-purple-700 font-semibold' : 'bg-gray-100 text-gray-600'
                )}
              >
                {FLAG_MAP[l]} {l.toUpperCase()}
              </button>
            ))}
          </div>
          <hr className="border-gray-100" />
          {session ? (
            <button
              onClick={() => { signOut({ callbackUrl: `/${locale}` }); setMobileOpen(false); }}
              className="block w-full text-left py-2 text-sm font-medium text-red-500"
            >
              {t('signout')}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link href={`/${locale}/auth/signin`} className="py-2 text-center text-sm font-medium border border-gray-200 rounded-xl" onClick={() => setMobileOpen(false)}>
                {t('signin')}
              </Link>
              <Link href={`/${locale}/auth/signup`} className="py-2 text-center text-sm font-semibold text-white gradient-primary rounded-xl" onClick={() => setMobileOpen(false)}>
                {t('signup')}
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
