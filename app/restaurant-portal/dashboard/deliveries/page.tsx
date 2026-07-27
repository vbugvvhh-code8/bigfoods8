'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/admin/layout/PageHeader';
import useRider from '@/hooks/useRider';
import getBrowserSupabase from '@/lib/supabase/client';

interface DeliveryRow {
  id: string;
  delivery_address: string | null;
  delivered_at: string | null;
  status: string;
  earned: number;
  wasTransfer: boolean;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  delivered: { label: 'Delivered', color: 'var(--green)' },
  cancelled: { label: 'Cancelled', color: 'var(--red)' },
};

export default function RiderDeliveriesPage() {
  const { rider, loading: riderLoading } = useRider();
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rider) return;
    (async () => {
      setLoading(true);
      const supabase = getBrowserSupabase();

      const { data: orders } = await supabase
        .from('orders')
        .select('id, delivery_address, delivered_at, status')
        .eq('rider_id', rider.id)
        .in('status', ['delivered', 'cancelled'])
        .order('delivered_at', { ascending: false })
        .limit(50);

      const { data: txns } = await supabase
        .from('transactions')
        .select('order_id, amount, type')
        .eq('rider_id', rider.id)
        .in('type', ['delivery_commission', 'delivery_commission_transfer', 'delivery_commission_transfer_original']);

      const earningsByOrder = new Map<string, { amount: number; wasTransfer: boolean }>();
      for (const t of txns ?? []) {
        if (!t.order_id) continue;
        const existing = earningsByOrder.get(t.order_id) ?? { amount: 0, wasTransfer: false };
        existing.amount += Number(t.amount);
        if (t.type !== 'delivery_commission') existing.wasTransfer = true;
        earningsByOrder.set(t.order_id, existing);
      }

      setRows(
        (orders ?? []).map((o) => ({
          id: o.id,
          delivery_address: o.delivery_address,
          delivered_at: o.delivered_at,
          status: o.status,
          earned: earningsByOrder.get(o.id)?.amount ?? 0,
          wasTransfer: earningsByOrder.get(o.id)?.wasTransfer ?? false,
        }))
      );
      setLoading(false);
    })();
  }, [rider]);

  if (riderLoading || !rider) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Deliveries" subtitle="Your delivery history" />

      {loading ? (
        <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ border: '1px dashed var(--line)' }}>
          <p className="text-[12.5px]" style={{ color: 'var(--gray)' }}>
            No deliveries yet — they'll show up here once you go online and start accepting orders.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const status = STATUS_LABEL[r.status] ?? { label: r.status, color: 'var(--gray)' };
            return (
              <div key={r.id} className="p-3.5 rounded-[10px]" style={{ border: '1px solid var(--line)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>
                    {r.delivery_address ?? 'Address not set'}
                  </span>
                  <span className="text-[11px] font-medium" style={{ color: status.color }}>
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: 'var(--gray)' }}>
                    {r.delivered_at ? new Date(r.delivered_at).toLocaleString() : '—'}
                    {r.wasTransfer && ' · handed off'}
                  </span>
                  {r.earned !== 0 && (
                    <span className="text-[12px] font-semibold" style={{ color: r.earned > 0 ? 'var(--ink)' : 'var(--red)' }}>
                      {r.earned > 0 ? '+' : ''}₦{r.earned.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
