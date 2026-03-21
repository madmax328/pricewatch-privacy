'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { X } from 'lucide-react';

const COOKIE_KEY = 'kidshade_cookie_consent';

export default function CookieBanner() {
  const locale = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto bg-gray-900 text-white rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-gray-300">
          <span className="font-semibold text-white">🍪 Cookies</span>{' '}
          Nous utilisons des cookies essentiels pour faire fonctionner le site (session, langue).{' '}
          <Link href={`/${locale}/cookies`} className="text-purple-400 hover:underline">
            En savoir plus
          </Link>
          .
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={decline}
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Refuser
          </button>
          <button
            onClick={accept}
            className="text-sm font-semibold px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 transition-colors"
          >
            Accepter
          </button>
          <button onClick={accept} className="text-gray-500 hover:text-white transition-colors ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
