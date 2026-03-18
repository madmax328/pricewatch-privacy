'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Users, BookOpen, ShoppingBag, TrendingUp, ArrowRight, Package, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

interface Stats {
  users: { total: number; free: number; premium: number; superpremium: number };
  stories: { total: number };
  orders: { total: number; paid: number; shipped: number; revenue: number };
  recentOrders: Array<{
    _id: string;
    storyTitle: string;
    childName: string;
    status: string;
    amountPaid: number;
    createdAt: string;
    userId: { name: string; email: string };
  }>;
  recentUsers: Array<{ _id: string; name: string; email: string; plan: string; createdAt: string }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'En attente paiement', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Payé', color: 'bg-blue-100 text-blue-700' },
  in_production: { label: 'En production', color: 'bg-purple-100 text-purple-700' },
  shipped: { label: 'Expédié', color: 'bg-green-100 text-green-700' },
  delivered: { label: 'Livré', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
  error: { label: 'Erreur', color: 'bg-red-200 text-red-800' },
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const locale = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = `/${locale}/auth/signin`;
      return;
    }
    if (status === 'authenticated') {
      fetch('/api/admin/stats')
        .then((r) => {
          if (r.status === 403) throw new Error('forbidden');
          return r.json();
        })
        .then(setStats)
        .catch((e) => {
          if (e.message === 'forbidden') {
            window.location.href = `/${locale}/dashboard`;
          } else {
            toast.error('Erreur lors du chargement');
          }
        })
        .finally(() => setLoading(false));
    }
  }, [status]);

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 rounded-full gradient-primary animate-spin border-4 border-purple-200" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen gradient-warm py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Admin — Tableau de bord</h1>
          <p className="text-gray-500 mt-1">Vue d'ensemble de Kidshade</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users className="w-6 h-6 text-purple-600" />} label="Utilisateurs" value={stats.users.total} sub={`${stats.users.premium + stats.users.superpremium} payants`} />
          <StatCard icon={<BookOpen className="w-6 h-6 text-blue-600" />} label="Histoires" value={stats.stories.total} />
          <StatCard icon={<ShoppingBag className="w-6 h-6 text-green-600" />} label="Commandes livres" value={stats.orders.total} sub={`${stats.orders.paid} payées`} />
          <StatCard icon={<TrendingUp className="w-6 h-6 text-yellow-600" />} label="Revenus livres" value={`€${(stats.orders.revenue / 100).toFixed(2)}`} />
        </div>

        {/* Plans breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Répartition des abonnements</h2>
          <div className="grid grid-cols-3 gap-4">
            <PlanBar label="Gratuit" count={stats.users.free} total={stats.users.total} color="bg-gray-300" />
            <PlanBar label="Premium" count={stats.users.premium} total={stats.users.total} color="bg-yellow-400" />
            <PlanBar label="Super Premium" count={stats.users.superpremium} total={stats.users.total} color="bg-purple-500" />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Recent orders */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Dernières commandes</h2>
              <Link href={`/${locale}/admin/orders`} className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                Voir tout <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {stats.recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune commande</p>
            ) : (
              <div className="space-y-3">
                {stats.recentOrders.map((o) => (
                  <div key={o._id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{o.storyTitle}</p>
                      <p className="text-gray-400">{o.userId?.email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[o.status]?.color}`}>
                        {STATUS_LABELS[o.status]?.label}
                      </span>
                      <p className="text-gray-500 mt-1">€{(o.amountPaid / 100).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent users */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Derniers inscrits</h2>
              <Link href={`/${locale}/admin/users`} className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                Voir tout <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {stats.recentUsers.map((u) => (
                <div key={u._id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{u.name}</p>
                    <p className="text-gray-400">{u.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.plan === 'free' ? 'bg-gray-100 text-gray-600' : u.plan === 'premium' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>
                    {u.plan}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { href: `/${locale}/admin/users`, icon: <Users className="w-5 h-5" />, label: 'Utilisateurs' },
            { href: `/${locale}/admin/orders`, icon: <Package className="w-5 h-5" />, label: 'Commandes' },
            { href: `/${locale}/admin/promo-codes`, icon: <Tag className="w-5 h-5" />, label: 'Codes promo' },
            { href: `/${locale}/dashboard`, icon: <BookOpen className="w-5 h-5" />, label: 'Mon dashboard' },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3 hover:border-purple-200 hover:shadow-md transition-all group">
              <span className="text-purple-500 group-hover:text-purple-700">{item.icon}</span>
              <span className="font-semibold text-gray-800 text-sm">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-sm text-gray-500">{label}</span></div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function PlanBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold">{count}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{pct}%</p>
    </div>
  );
}
