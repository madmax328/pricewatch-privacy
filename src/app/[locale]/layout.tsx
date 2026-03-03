import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SessionProvider from '@/components/SessionProvider';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Toaster } from 'react-hot-toast';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Kidshade — Histoires magiques pour enfants',
  description: 'L\'IA crée des histoires personnalisées où votre enfant est le héros. En 30 secondes, dans votre langue.',
  keywords: 'histoires pour enfants, IA, personnalisé, bedtime stories, contes',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Kidshade — Histoires magiques pour enfants',
    description: 'L\'IA crée des histoires personnalisées où votre enfant est le héros.',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Kidshade',
  },
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();
  const session = await getServerSession(authOptions);

  return (
    <html lang={locale} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-white text-gray-900 antialiased font-sans">
        <NextIntlClientProvider messages={messages}>
          <SessionProvider session={session}>
            <Toaster position="top-center" />
            <Navbar locale={locale} />
            <main className="min-h-screen">{children}</main>
            <Footer locale={locale} />
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
