'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import getBrowserSupabase from '@/lib/supabase/client';
import usePricingConfig from '@/hooks/usePricingConfig';
import CancelConfirm from '@/components/rider/dashboard/CancelConfirm';
import type { Order, Restaurant, Profile } from '@/types/database';

function mapsUrl(lat: number | null, lng: number | null, address: string | null) {
  if (lat != null && lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? '')}`;
}

async function fetchOrderContext(supabase: ReturnType<typeof getBrowserSupabase>, orderId: string) {
  const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (!o) return { order: null, restaurant: null, customer: null };
  const [{ data: r }, { data: c }] = await Promise.all([
    supabase.from('restaurants').select('*').eq('id', o.restaurant_id).maybeSingle(),
    o.customer_id ? supabase.from('profiles').select('*').eq('id', o.customer_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { order: o as Order, restaurant: (r as Restaurant) ?? null, customer: (c as Profile) ?? null };
}

export default function DeliveryDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const { prices } = usePricingConfig(['cancellation_penalty_pct']);

  useEffect(() => {
    fetchOrderContext(supabase, orderId).then(({ order, restaurant, customer }) => {
      setOrder(order); setRestaurant(restaurant); setCustomer(customer);
    });
  }, [orderId, supabase]);

  async function advance(action: 'picked_up' | 'delivered') {
    setError(null);
    setBusy(true);
    const { data, error: fnError } = await supabase.functions.invoke('rider-update-delivery', {
      body: { order_id: orderId, action, delivery_code: action === 'delivered' ? code : undefined },
    });
    setBusy(false);
    if (fnError) { setError(fnError.message); return; }
    if (data?.error) { setError(data.error); return; }
    if (action === 'delivered') { router.push('/rider-portal/dashboard'); return; }
    setOrder(data.order as Order);
  }

  async function cancelDelivery() {
    setError(null);
    setBusy(true);
    const { data, error: fnError } = await supabase.functions.invoke('rider-cancel-delivery', { body: { order_id: orderId } });
    setBusy(false);
    if (fnError) { setError(fnError.message); return; }
    if (data?.error) { setError(data.error); return; }
    router.push('/rider-portal/dashboard');
  }

  if (!order) {
    return <p className="text-[12.5px] pt-8 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>;
  }

  const stage: 'to_pickup' | 'to_dropoff' = order.status === 'picked_up' ? 'to_dropoff' : 'to_pickup';
  const penaltyPct = prices.cancellation_penalty_pct;
  const destLat = stage === 'to_pickup' ? restaurant?.latitude ?? null : order.delivery_lat;
  const destLng = stage === 'to_pickup' ? restaurant?.longitude ?? null : order.delivery_lng;
  const destAddress = stage === 'to_pickup' ? restaurant?.address ?? null : order.delivery_address;

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        {stage === 'to_pickup' ? 'Head to pickup' : 'Head to drop-off'}
      </p>
      <h2 className="text-[19px] font-semibold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {stage === 'to_pickup' ? restaurant?.name ?? 'Restaurant' : customer?.full_name ?? 'Customer'}
      </h2>

      <div className="rounded-[10px] p-3.5 mb-3" style={{ border: '1px solid var(--line)' }}>
        <p className="text-[12px] mb-2" style={{ color: 'var(--ink)' }}>{destAddress ?? 'Address not available'}</p>
        <a
          href={mapsUrl(destLat, destLng, destAddress)}
          target="_blank" rel="noreferrer"
          className="text-[11.5px] font-semibold"
          style={{ color: 'var(--orange)' }}
        >
          Open in Maps →
        </a>
      </div>

      {stage === 'to_dropoff' && customer?.phone && (
        <div className="rounded-[10px] p-3.5 mb-3" style={{ border: '1px solid var(--line)' }}>
          <p className="text-[10.5px] uppercase tracking-wide mb-1" style={{ color: 'var(--gray)' }}>Customer phone</p>
          <a href={`tel:${customer.phone}`} className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{customer.phone}</a>
        </div>
      )}

      {error && <p className="text-[11.5px] mb-3" style={{ color: 'var(--red)' }}>{error}</p>}

      {stage === 'to_pickup' ? (
        <button onClick={() => advance('picked_up')} disabled={busy}
          className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40"
          style={{ background: 'var(--orange)' }}>
          {busy ? '…' : "I've picked up the order"}
        </button>
      ) : (
        <>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Ask the customer for their delivery code</label>
          <input
            value={code} onChange={(e) => setCode(e.target.value)} placeholder="4-digit code" inputMode="numeric"
            className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none mb-3"
            style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
          <button onClick={() => advance('delivered')} disabled={busy || code.length < 4}
            className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40"
            style={{ background: 'var(--orange)' }}>
            {busy ? '…' : 'Confirm delivery'}
          </button>
        </>
      )}

      {confirmingCancel ? (
        <CancelConfirm
          showPenalty={stage === 'to_dropoff'}
          penaltyPct={penaltyPct}
          busy={busy}
          onConfirm={cancelDelivery}
          onDismiss={() => setConfirmingCancel(false)}
        />
      ) : (
        <button onClick={() => setConfirmingCancel(true)} className="w-full py-2.5 mt-3 text-[12px]" style={{ color: 'var(--red)', background: 'none', border: 'none' }}>
          Cancel this delivery
        </button>
      )}
    </>
  );
}
