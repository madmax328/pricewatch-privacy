'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface PromoCode {
  _id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  appliesTo: 'book' | 'subscription' | 'all';
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
}

const EMPTY_FORM = {
  code: '',
  discountType: 'percent' as 'percent' | 'fixed',
  discountValue: 10,
  appliesTo: 'all' as 'book' | 'subscription' | 'all',
  maxUses: '',
  expiresAt: '',
};

export default function AdminPromoCodesPage() {
  const { data: session, status } = useSession();
  const locale = useLocale();

  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') { window.location.href = `/${locale}/auth/signin`; return; }
    if (status === 'authenticated') fetchCodes();
  }, [status]);

  const fetchCodes = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/promo-codes');
    if (res.status === 403) { window.location.href = `/${locale}/dashboard`; return; }
    const data = await res.json();
    setCodes(data.codes);
    setLoading(false);
  };

  const createCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          maxUses: form.maxUses ? parseInt(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
          discountValue: form.discountType === 'fixed'
            ? Math.round(parseFloat(String(form.discountValue)) * 100) // convert € to cents
            : form.discountValue,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const { promo } = await res.json();
      setCodes((prev) => [promo, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success(`Code ${promo.code} créé !`);
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  const toggleCode = async (promoId: string, active: boolean) => {
    setToggling(promoId);
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoId, active }),
      });
      if (!res.ok) throw new Error();
      const { promo } = await res.json();
      setCodes((prev) => prev.map((c) => (c._id === promoId ? promo : c)));
    } catch {
      toast.error('Erreur');
    } finally {
      setToggling(null);
    }
  };

  const deleteCode = async (promoId: string) => {
    if (!confirm('Supprimer ce code promo ?')) return;
    try {
      await fetch('/api/admin/promo-codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoId }),
      });
      setCodes((prev) => prev.filter((c) => c._id !== promoId));
      toast.success('Code supprimé');
    } catch {
      toast.error('Erreur');
    }
  };

  return (
    <div className="min-h-screen gradient-warm py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}/admin`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour admin
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Codes promo</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white gradient-primary hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Nouveau code
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Créer un code promo</h2>
            <form onSubmit={createCode} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="ex: NOEL25"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-300 focus:outline-none text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de réduction</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value as 'percent' | 'fixed' })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-300 focus:outline-none text-sm bg-white"
                >
                  <option value="percent">Pourcentage (%)</option>
                  <option value="fixed">Montant fixe (€)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valeur {form.discountType === 'percent' ? '(%)' : '(€)'}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={form.discountType === 'percent' ? 100 : undefined}
                  step={form.discountType === 'fixed' ? '0.01' : '1'}
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-300 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Applicable sur</label>
                <select
                  value={form.appliesTo}
                  onChange={(e) => setForm({ ...form, appliesTo: e.target.value as 'book' | 'subscription' | 'all' })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-300 focus:outline-none text-sm bg-white"
                >
                  <option value="all">Tout (livres + abonnements)</option>
                  <option value="book">Livres uniquement</option>
                  <option value="subscription">Abonnements uniquement</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Utilisations max (optionnel)</label>
                <input
                  type="number"
                  min={1}
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  placeholder="Illimité"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-300 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expire le (optionnel)</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-300 focus:outline-none text-sm"
                />
              </div>
              <div className="col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white gradient-primary hover:opacity-90 disabled:opacity-60"
                >
                  {creating ? 'Création...' : 'Créer le code'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Codes list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400">Chargement...</div>
          ) : codes.length === 0 ? (
            <div className="p-10 text-center text-gray-400">Aucun code promo</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Réduction</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Applicable</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Utilisations</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Expire</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {codes.map((c) => (
                  <tr key={c._id} className={!c.active ? 'opacity-50' : ''}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{c.code}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {c.discountType === 'percent' ? `${c.discountValue}%` : `€${(c.discountValue / 100).toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{c.appliesTo}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <button
                        onClick={() => toggleCode(c._id, !c.active)}
                        disabled={toggling === c._id}
                        className="text-gray-400 hover:text-purple-600 transition-colors"
                        title={c.active ? 'Désactiver' : 'Activer'}
                      >
                        {c.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => deleteCode(c._id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
