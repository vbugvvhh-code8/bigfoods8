'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';

interface StuckOrder {
  id: string;
  dispatch_retry_count: number;
  last_dispatch_attempt_at: string | null;
  zone: string | null;
}

interface TransferRow {
  id: string;
  order_id: string;
  status: string;
  reward_pct: number;
  cancellation_reason: string;
  cancellation_note: string | null;
  created_at: string;
  original_rider: { name: string; phone: string | null } | null;
  new_rider: { name: string; phone: string | null } | null;
}

export default function AdminDispatchPage() {
  const [stuckOrders, setStuckOrders] = useState<StuckOrder[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const supabase = getBrowserSupabase();

      const [{ data: orders }, { data: xfers }] = await Promise.all([
        supabase
          .from('orders')
          .select('id, dispatch_retry_count, last_dispatch_attempt_at, zone')
          .in('status', ['placed', 'preparing'])
          .is('rider_id', null)
          .order('dispatch_retry_count', { ascending: false }),
        supabase
          .from('rider_transfers')
          .select(
            'id, order_id, status, reward_pct, cancellation_reason, cancellation_note, created_at, original_rider:original_rider_id(name, phone), new_rider:new_rider_id(name, phone)'
          )
          .in('status', ['open', 'claimed'])
          .order('created_at', { ascending: false }),
      ]);

      setStuckOrders((orders as StuckOrder[]) ?? []);
      setTransfers((xfers as unknown as TransferRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Dispatch" subtitle="Orders with no rider, and rider hand-offs in progress" />

      {loading ? (
        <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>
      ) : (
        <>
          <div>
            <p className="text-[13px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
              Orders with no rider ({stuckOrders.length})
            </p>
            {stuckOrders.length === 0 ? (
              <p className="text-[12px]" style={{ color: 'var(--gray)' }}>None right now.</p>
            ) : (
              <div className="space-y-2">
                {stuckOrders.map((o) => (
                  <div key={o.id} className="p-3.5 rounded-[10px] flex items-center justify-between" style={{ border: '1px solid var(--line)' }}>
                    <div>
                      <p className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>{o.id}</p>
                      <p className="text-[11px]" style={{ color: 'var(--gray)' }}>
                        Zone: {o.zone ?? '—'} · Last attempt:{' '}
                        {o.last_dispatch_attempt_at ? new Date(o.last_dispatch_attempt_at).toLocaleTimeString() : '—'}
                      </p>
                    </div>
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--red)' }}>
                      {o.dispatch_retry_count} {o.dispatch_retry_count === 1 ? 'retry' : 'retries'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[13px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
              Rider hand-offs in progress ({transfers.length})
            </p>
            {transfers.length === 0 ? (
              <p className="text-[12px]" style={{ color: 'var(--gray)' }}>None right now.</p>
            ) : (
              <div className="space-y-2">
                {transfers.map((t) => (
                  <div key={t.id} className="p-3.5 rounded-[10px]" style={{ border: '1px solid var(--line)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>Order {t.order_id.slice(0, 8)}</p>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          color: t.status === 'open' ? 'var(--orange)' : 'var(--gray)',
                          background: t.status === 'open' ? 'var(--peach)' : '#F0EEEB',
                        }}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-[11.5px] mb-0.5" style={{ color: 'var(--ink)' }}>
                      From: {t.original_rider?.name ?? '—'} {t.original_rider?.phone ? `(${t.original_rider.phone})` : ''}
                    </p>
                    {t.new_rider && (
                      <p className="text-[11.5px] mb-0.5" style={{ color: 'var(--ink)' }}>
                        Claimed by: {t.new_rider.name} {t.new_rider.phone ? `(${t.new_rider.phone})` : ''}
                      </p>
                    )}
                    <p className="text-[11px]" style={{ color: 'var(--gray)' }}>
                      {t.cancellation_reason}{t.cancellation_note ? ` — ${t.cancellation_note}` : ''} · {t.reward_pct}% reward
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
