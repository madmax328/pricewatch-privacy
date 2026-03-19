'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

function ReturnContent() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<'open' | 'complete' | 'expired' | null>(null);
  const [sessionType, setSessionType] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/stripe/checkout-status?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setStatus(data.status);
        setSessionType(data.type);
      });
  }, [sessionId]);

  if (!status) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'complete') {
    const isBook = sessionType === 'book';
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Paiement confirmé !</h1>
          <p className="text-gray-500 mb-8">
            {isBook
              ? 'Votre commande de livre est bien enregistrée. Vous recevrez un email de confirmation.'
              : 'Votre abonnement est activé. Profitez de toutes vos nouvelles fonctionnalités !'}
          </p>
          <Link
            href={isBook ? `/${locale}/account` : `/${locale}/dashboard`}
            className="inline-block w-full py-3 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {isBook ? 'Voir mes commandes' : 'Aller au tableau de bord'}
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'open') {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
          <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Paiement en cours…</h1>
          <p className="text-gray-500 mb-8">Votre paiement est en cours de traitement. Veuillez patienter.</p>
          <Link
            href={`/${locale}/pricing`}
            className="inline-block w-full py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-purple-200 hover:text-purple-700 transition-colors"
          >
            Retour aux tarifs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
        <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Session expirée</h1>
        <p className="text-gray-500 mb-8">Cette session de paiement a expiré. Veuillez recommencer.</p>
        <Link
          href={`/${locale}/pricing`}
          className="inline-block w-full py-3 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Retour aux tarifs
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
      </div>
    }>
      <ReturnContent />
    </Suspense>
  );
}
