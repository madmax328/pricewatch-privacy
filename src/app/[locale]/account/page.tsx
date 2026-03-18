'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Crown, Sparkles, Zap, User, MapPin, CreditCard, AlertTriangle, ArrowLeft, Package, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface DeliveryAddress {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

interface UserData {
  name: string;
  email: string;
  plan: 'free' | 'premium' | 'superpremium';
  stripeCurrentPeriodEnd?: string;
  stripeSubscriptionId?: string;
  deliveryAddress?: DeliveryAddress;
  createdAt: string;
}

interface BookOrder {
  _id: string;
  storyTitle: string;
  childName: string;
  status: string;
  amountPaid: number;
  trackingUrl?: string;
  trackingNumber?: string;
  carrier?: string;
  createdAt: string;
}

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'En attente de paiement', color: 'text-yellow-600' },
  paid: { label: 'Payé — en attente production', color: 'text-blue-600' },
  in_production: { label: 'En cours d\'impression', color: 'text-purple-600' },
  shipped: { label: 'Expédié', color: 'text-green-600' },
  delivered: { label: 'Livré', color: 'text-gray-600' },
  cancelled: { label: 'Annulé', color: 'text-red-600' },
  error: { label: 'Erreur', color: 'text-red-700' },
};

const PLAN_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  free: { label: 'Gratuit', icon: <Sparkles className="w-5 h-5 text-purple-500" />, color: 'text-gray-700' },
  premium: { label: 'Premium', icon: <Crown className="w-5 h-5 text-yellow-500" />, color: 'text-yellow-600' },
  superpremium: { label: 'Super Premium', icon: <Zap className="w-5 h-5 text-purple-600" />, color: 'text-purple-700' },
};

export default function AccountPage() {
  const { data: session, status } = useSession();
  const locale = useLocale();
  const t = useTranslations('account');
  const tc = useTranslations('common');

  const [user, setUser] = useState<UserData | null>(null);
  const [orders, setOrders] = useState<BookOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Delivery address form
  const [address, setAddress] = useState<DeliveryAddress>({});
  const [savingAddress, setSavingAddress] = useState(false);

  // Cancel subscription
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = `/${locale}/auth/signin`;
      return;
    }
    if (status === 'authenticated') {
      Promise.all([fetch('/api/user').then((r) => r.json()), fetch('/api/orders').then((r) => r.json())])
        .then(([userData, ordersData]) => {
          setUser(userData.user);
          setName(userData.user.name || '');
          setAddress(userData.user.deliveryAddress || {});
          setOrders(ordersData.orders || []);
        })
        .catch(() => toast.error(tc('error')))
        .finally(() => setLoading(false));
    }
  }, [status]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const { user: updated } = await res.json();
      setUser(updated);
      toast.success(t('profileSaved'));
    } catch {
      toast.error(tc('error'));
    } finally {
      setSavingProfile(false);
    }
  };

  const saveAddress = async () => {
    setSavingAddress(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryAddress: address }),
      });
      if (!res.ok) throw new Error();
      const { user: updated } = await res.json();
      setUser(updated);
      toast.success(t('addressSaved'));
    } catch {
      toast.error(tc('error'));
    } finally {
      setSavingAddress(false);
    }
  };

  const cancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await fetch('/api/user', { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(t('cancelSuccess'));
      setShowCancelConfirm(false);
      // Refresh user data
      const { user: updated } = await (await fetch('/api/user')).json();
      setUser(updated);
    } catch {
      toast.error(tc('error'));
    } finally {
      setCancelling(false);
    }
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

  const planInfo = PLAN_LABELS[user?.plan || 'free'];
  const periodEnd = user?.stripeCurrentPeriodEnd
    ? new Date(user.stripeCurrentPeriodEnd).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen gradient-warm py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          href={`/${locale}/dashboard`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToDashboard')}
        </Link>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">{t('title')}</h1>

        <div className="space-y-6">
          {/* Current plan */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-gray-900">{t('planSection')}</h2>
            </div>
            <div className="flex items-center gap-3 mb-3">
              {planInfo.icon}
              <span className={`font-bold text-lg ${planInfo.color}`}>{planInfo.label}</span>
            </div>
            {periodEnd && (
              <p className="text-sm text-gray-500">
                {t('renewsOn')} <span className="font-semibold text-gray-700">{periodEnd}</span>
              </p>
            )}
            {user?.plan === 'free' && (
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/${locale}/pricing`}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white gradient-primary hover:opacity-90 transition-opacity"
                >
                  {t('upgradePlan')}
                </Link>
              </div>
            )}
          </section>

          {/* Personal data */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-gray-900">{t('personalSection')}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('nameLabel')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('emailLabel')}</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">{t('emailReadOnly')}</p>
              </div>
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white gradient-primary hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {savingProfile ? tc('loading') : t('saveProfile')}
              </button>
            </div>
          </section>

          {/* Delivery address */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-gray-900">{t('addressSection')}</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">{t('addressDesc')}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('firstName')}</label>
                <input
                  type="text"
                  value={address.firstName || ''}
                  onChange={(e) => setAddress({ ...address, firstName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('lastName')}</label>
                <input
                  type="text"
                  value={address.lastName || ''}
                  onChange={(e) => setAddress({ ...address, lastName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('street')}</label>
                <input
                  type="text"
                  value={address.address || ''}
                  onChange={(e) => setAddress({ ...address, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('postalCode')}</label>
                <input
                  type="text"
                  value={address.postalCode || ''}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('city')}</label>
                <input
                  type="text"
                  value={address.city || ''}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('country')}</label>
                <input
                  type="text"
                  value={address.country || ''}
                  onChange={(e) => setAddress({ ...address, country: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
                />
              </div>
            </div>
            <button
              onClick={saveAddress}
              disabled={savingAddress}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white gradient-primary hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {savingAddress ? tc('loading') : t('saveAddress')}
            </button>
          </section>

          {/* Book orders */}
          {orders.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-gray-400" />
                <h2 className="font-bold text-gray-900">Mes commandes de livres</h2>
              </div>
              <div className="space-y-4">
                {orders.map((order) => {
                  const statusInfo = ORDER_STATUS_LABELS[order.status] || { label: order.status, color: 'text-gray-600' };
                  return (
                    <div key={order._id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-800">{order.storyTitle}</p>
                          <p className="text-sm text-gray-500">Pour {order.childName}</p>
                          <p className={`text-sm font-medium mt-1 ${statusInfo.color}`}>{statusInfo.label}</p>
                          {order.trackingNumber && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {order.carrier && `${order.carrier} — `}
                              {order.trackingNumber}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-gray-800">€{(order.amountPaid / 100).toFixed(2)}</p>
                          <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          {order.trackingUrl && (
                            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline mt-1">
                              Suivre <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Cancel subscription */}
          {user?.plan !== 'free' && (
            <section className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h2 className="font-bold text-gray-900">{t('cancelSection')}</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">{t('cancelDesc')}</p>
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-red-600 border-2 border-red-200 hover:bg-red-50 transition-colors"
                >
                  {t('cancelBtn')}
                </button>
              ) : (
                <div className="bg-red-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-red-700">{t('cancelConfirmText')}</p>
                  {periodEnd && (
                    <p className="text-sm text-red-600">{t('cancelAccessUntil', { date: periodEnd })}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={cancelSubscription}
                      disabled={cancelling}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60"
                    >
                      {cancelling ? tc('loading') : t('cancelConfirmBtn')}
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      {t('cancelAbort')}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
