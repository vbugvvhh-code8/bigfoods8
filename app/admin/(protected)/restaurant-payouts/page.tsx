'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Banknote } from 'lucide-react';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';
import { extractEdgeFunctionError } from '@/lib/extractEdgeFunctionError';

interface PayoutRow {
  id: string;
  restaurant_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
  bank_account_snapshot: { account_name: string; account_number: string; bank_name: string } | null;
  restaurants: { name: string } | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'var(--orange)' },
  processing: { label: 'Approved · awaiting transfer', color: 'var(--orange)' },
  paid: { label: 'Paid', color: 'var(--green)' },
  rejected: { label: 'Rejected', color: 'var(--red)' },
};

export default function RestaurantPayoutsPage() {
  const supabase = getBrowserSupabase();
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function fetchPayouts() {
    setLoading(true);
    const { data } = await supabase
      .from('restaurant_payouts')
      .select('*, restaurants(name)')
      .order('requested_at', { ascending: false });
    setPayouts((data as any[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchPayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAction(payoutId: string, action: 'approve' | 'reject' | 'mark_paid', reason?: string) {
    setBusyId(payoutId);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke('admin-manage-restaurant-payout', {
      body: { payoutId, action, reason },
    });
    setBusyId(null);
    if (fnError) {
      setError(await extractEdgeFunctionError(fnError));
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }
    setRejectingId(null);
    setRejectReason('');
    fetchPayouts();
  }

  const pending = payouts.filter((p) => p.status === 'pending' || p.status === 'processing');
  const history = payouts.filter((p) => p.status === 'paid' || p.status === 'rejected');

  return (
    <div>
      <PageHeader title="Restaurant Payouts" subtitle="Review and process restaurant withdrawal requests" />

      {error && (
        <p className="text-[11.5px] mb-3 p-3 rounded-[9px]" style={{ background: '#FEF2F2', color: 'var(--red)' }}>
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-[12px] py-6 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>
      ) : (
        <>
          <p className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
            Awaiting action ({pending.length})
          </p>
          {pending.length === 0 ? (
            <p className="text-[12px] mb-5" style={{ color: 'var(--gray)' }}>Nothing pending.</p>
          ) : (
            <div className="space-y-2.5 mb-6">
              {pending.map((p) => (
                <div key={p.id} className="p-3.5 rounded-[10px]" style={{ border: '1px solid var(--line)', background: 'white' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
                      {p.restaurants?.name ?? 'Unknown restaurant'}
                    </p>
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--peach)', color: STATUS_LABEL[p.status].color }}>
                      {STATUS_LABEL[p.status].label}
                    </span>
                  </div>

                  <div className="text-[12px] mb-1" style={{ color: 'var(--ink)' }}>
                    ₦{Number(p.amount).toLocaleString()} requested · fee ₦{Number(p.fee).toLocaleString()} · net{' '}
                    <b>₦{Number(p.net_amount).toLocaleString()}</b>
                  </div>

                  {p.bank_account_snapshot && (
                    <p className="text-[11.5px] mb-2" style={{ color: 'var(--gray)' }}>
                      {p.bank_account_snapshot.bank_name} · {p.bank_account_snapshot.account_number} ·{' '}
                      {p.bank_account_snapshot.account_name}
                    </p>
                  )}

                  <p className="text-[10.5px] mb-2.5" style={{ color: 'var(--gray)' }}>
                    Requested {new Date(p.requested_at).toLocaleString()}
                  </p>

                  {rejectingId === p.id ? (
                    <div className="space-y-2">
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection"
                        className="w-full px-3 py-2 rounded-[8px] text-[12px] outline-none"
                        style={{ border: '1px solid var(--line)' }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRejectingId(null)}
                          className="flex-1 py-2 rounded-[8px] text-[11.5px] font-semibold"
                          style={{ border: '1px solid var(--line)', color: 'var(--gray)' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAction(p.id, 'reject', rejectReason)}
                          disabled={!rejectReason || busyId === p.id}
                          className="flex-1 py-2 rounded-[8px] text-[11.5px] font-semibold text-white disabled:opacity-40"
                          style={{ background: 'var(--red)' }}
                        >
                          Confirm rejection
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {p.status === 'pending' && (
                        <>
                          <button
                            onClick={() => setRejectingId(p.id)}
                            disabled={busyId === p.id}
                            className="flex-1 py-2 rounded-[8px] text-[11.5px] font-semibold flex items-center justify-center gap-1.5"
                            style={{ border: '1px solid var(--red)', color: 'var(--red)' }}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button
                            onClick={() => handleAction(p.id, 'approve')}
                            disabled={busyId === p.id}
                            className="flex-1 py-2 rounded-[8px] text-[11.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
                            style={{ background: 'var(--orange)' }}
                          >
                            {busyId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                        </>
                      )}
                      {p.status === 'processing' && (
                        <button
                          onClick={() => handleAction(p.id, 'mark_paid')}
                          disabled={busyId === p.id}
                          className="flex-1 py-2 rounded-[8px] text-[11.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
                          style={{ background: 'var(--green)' }}
                        >
                          {busyId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
                          Mark paid — I've sent the transfer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>History</p>
          {history.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--gray)' }}>No processed payouts yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-[8px]" style={{ border: '1px solid var(--line)' }}>
                  <div>
                    <p className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{p.restaurants?.name ?? 'Unknown'}</p>
                    <p className="text-[11px]" style={{ color: 'var(--gray)' }}>₦{Number(p.amount).toLocaleString()}</p>
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: STATUS_LABEL[p.status].color }}>
                    {STATUS_LABEL[p.status].label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
