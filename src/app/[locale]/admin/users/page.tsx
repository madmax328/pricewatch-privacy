'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  name: string;
  email: string;
  plan: 'free' | 'premium' | 'superpremium';
  role: 'user' | 'admin' | 'disabled';
  createdAt: string;
  stripeCurrentPeriodEnd?: string;
}

const PLAN_OPTIONS = ['all', 'free', 'premium', 'superpremium'];

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const locale = useLocale();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search, plan: planFilter });
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.status === 403) { window.location.href = `/${locale}/dashboard`; return; }
    const data = await res.json();
    setUsers(data.users);
    setTotal(data.total);
    setPages(data.pages);
    setLoading(false);
  }, [page, search, planFilter, locale]);

  useEffect(() => {
    if (status === 'unauthenticated') { window.location.href = `/${locale}/auth/signin`; return; }
    if (status === 'authenticated') fetchUsers();
  }, [status, fetchUsers]);

  const updateUser = async (userId: string, updates: Partial<{ plan: string; disabled: boolean }>) => {
    setUpdating(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });
      if (!res.ok) throw new Error();
      const { user } = await res.json();
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, ...user } : u)));
      toast.success('Mis à jour');
    } catch {
      toast.error('Erreur');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen gradient-warm py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}/admin`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour admin
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Utilisateurs ({total})</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm bg-white"
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p}>{p === 'all' ? 'Tous les plans' : p}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400">Chargement...</div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-gray-400">Aucun utilisateur</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Rôle</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Inscrit le</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u._id} className={u.role === 'disabled' ? 'opacity-50' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{u.name}</p>
                      <p className="text-gray-400 text-xs">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.plan}
                        disabled={updating === u._id}
                        onChange={(e) => updateUser(u._id, { plan: e.target.value })}
                        className="px-2 py-1 rounded-lg border border-gray-200 text-xs bg-white focus:ring-2 focus:ring-purple-300 focus:outline-none"
                      >
                        <option value="free">Gratuit</option>
                        <option value="premium">Premium</option>
                        <option value="superpremium">Super Premium</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'disabled' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => updateUser(u._id, { disabled: u.role !== 'disabled' })}
                        disabled={updating === u._id || u.role === 'admin'}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 ${u.role === 'disabled' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                      >
                        {u.role === 'disabled' ? 'Réactiver' : 'Désactiver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">Page {page} / {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
