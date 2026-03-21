'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
  _id: string;
  storyTitle: string;
  childName: string;
  status: string;
  amountPaid: number;
  currency: string;
  promoCode?: string;
  discountAmount?: number;
  trackingUrl?: string;
  trackingNumber?: string;
  carrier?: string;
  luluJobId?: string;
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  userId?: { name: string; email: string };
  deliveryAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

const STATUS_OPTIONS = ['all', 'pending_payment', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled', 'error'];
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Payé', color: 'bg-blue-100 text-blue-700' },
  in_production: { label: 'En production', color: 'bg-purple-100 text-purple-700' },
  shipped: { label: 'Expédié', color: 'bg-green-100 text-green-700' },
  delivered: { label: 'Livré', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
  error: { label: 'Erreur', color: 'bg-red-200 text-red-800' },
};

export default function AdminOrdersPage() {
  const { data: session, status } = useSession();
  const locale = useLocale();

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), status: statusFilter });
    const res = await fetch(`/api/admin/orders?${params}`);
    if (res.status === 403) { window.location.href = `/${locale}/dashboard`; return; }
    const data = await res.json();
    setOrders(data.orders);
    setTotal(data.total);
    setPages(data.pages);
    setLoading(false);
  }, [page, statusFilter, locale]);

  useEffect(() => {
    if (status === 'unauthenticated') { window.location.href = `/${locale}/auth/signin`; return; }
    if (status === 'authenticated') fetchOrders();
  }, [status, fetchOrders]);

  const saveOrderEdit = async () => {
    if (!editOrder) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: editOrder._id,
          status: editOrder.status,
          trackingUrl: editOrder.trackingUrl,
          trackingNumber: editOrder.trackingNumber,
          carrier: editOrder.carrier,
        }),
      });
      if (!res.ok) throw new Error();
      const { order } = await res.json();
      setOrders((prev) => prev.map((o) => (o._id === order._id ? order : o)));
      setEditOrder(null);
      toast.success('Commande mise à jour');
    } catch {
      toast.error('Erreur');
    } finally {
      setSaving(false);
    }
  };

  const retryLulu = async (orderId: string) => {
    setRetryingId(orderId);
    try {
      const res = await fetch('/api/admin/orders/retry-lulu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(`Erreur Lulu: ${data.error ?? res.status}`);
        return;
      }
      toast.success(`Envoyé à Lulu ✓ jobId: ${data.luluJobId}`);
      await fetchOrders();
    } catch (err) {
      toast.error(`Erreur réseau: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="min-h-screen gradient-warm py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}/admin`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour admin
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Commandes livres ({total})</h1>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'gradient-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300'}`}
            >
              {s === 'all' ? 'Toutes' : STATUS_LABELS[s]?.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400">Chargement...</div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-gray-400">Aucune commande</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Livre / Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Livraison</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Montant</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{o.storyTitle}</p>
                      <p className="text-gray-400 text-xs">{o.userId?.email}</p>
                      {o.trackingUrl && (
                        <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-500 hover:underline flex items-center gap-0.5 mt-0.5">
                          Suivi <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <p>{o.deliveryAddress.firstName} {o.deliveryAddress.lastName}</p>
                      <p>{o.deliveryAddress.city}, {o.deliveryAddress.country}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">€{(o.amountPaid / 100).toFixed(2)}</p>
                      {o.promoCode && <p className="text-xs text-green-600">Code: {o.promoCode}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[o.status]?.color}`}>
                        {STATUS_LABELS[o.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(o.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 flex flex-col gap-1">
                      <button
                        onClick={() => setEditOrder(o)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium transition-colors"
                      >
                        Modifier
                      </button>
                      {o.status === 'paid' && !o.luluJobId && (
                        <button
                          onClick={() => retryLulu(o._id)}
                          disabled={retryingId === o._id}
                          className="text-xs px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium transition-colors disabled:opacity-50"
                        >
                          {retryingId === o._id ? 'Envoi...' : 'Relancer Lulu'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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

      {/* Edit modal */}
      {editOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Modifier la commande</h2>
            <p className="text-sm text-gray-500 mb-4">{editOrder.storyTitle} — {editOrder.userId?.email}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={editOrder.status}
                  onChange={(e) => setEditOrder({ ...editOrder, status: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-300 focus:outline-none text-sm"
                >
                  {STATUS_OPTIONS.filter((s) => s !== 'all').map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]?.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transporteur</label>
                <input
                  type="text"
                  value={editOrder.carrier || ''}
                  onChange={(e) => setEditOrder({ ...editOrder, carrier: e.target.value })}
                  placeholder="ex: Colissimo, DHL..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-300 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de suivi</label>
                <input
                  type="text"
                  value={editOrder.trackingNumber || ''}
                  onChange={(e) => setEditOrder({ ...editOrder, trackingNumber: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-300 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de suivi</label>
                <input
                  type="text"
                  value={editOrder.trackingUrl || ''}
                  onChange={(e) => setEditOrder({ ...editOrder, trackingUrl: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-300 focus:outline-none text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveOrderEdit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white gradient-primary hover:opacity-90 disabled:opacity-60"
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button
                onClick={() => setEditOrder(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
