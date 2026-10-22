'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Phone, MapPin, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import getBrowserSupabase from '@/lib/supabase/client';
import usePricingConfig from '@/hooks/usePricingConfig';
import CancelConfirm from '@/components/rider/dashboard/CancelConfirm';
import type { Order, Restaurant, Profile } from '@/types/database';

const DeliveryMap = dynamic(() => import('@/components/rider/dashboard/DeliveryMap'), { ssr: false, loading: () => <div className="h-[300px] animate-pulse" style={{ background: '#f4f2ef' }} /> });

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
  const [showDeliveryCodeModal, setShowDeliveryCodeModal] = useState(false);
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
    if (fnError) { setError('Could not reach the delivery service. Check your connection and try again.'); return; }
    if (data?.error) { setError(data.error); return; }
    if (action === 'delivered') { router.push('/rider-portal/dashboard'); return; }
    setOrder(data.order as Order);
  }

  async function cancelDelivery() {
    setError(null);
    setBusy(true);
    const { data, error: fnError } = await supabase.functions.invoke('rider-cancel-delivery', { body: { order_id: orderId } });
    setBusy(false);
    if (fnError) { setError('Could not reach the delivery service. Check your connection and try again.'); return; }
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

      <div className="overflow-hidden rounded-[22px] mb-4" style={{ border: '1px solid var(--line)', background: '#f5f5f5' }}>
        <DeliveryMap latitude={destLat} longitude={destLng} />
        <div className="p-4" style={{ background: '#111111', color: '#ffffff' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: '#343434', color: '#ffffff' }}>
              <MapPin size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#ff7900' }}>
                {stage === 'to_pickup' ? 'Pickup location' : 'Customer drop-off'}
              </p>
              <p className="mt-1 text-[15px] font-semibold">{stage === 'to_pickup' ? restaurant?.name ?? 'Restaurant' : customer?.full_name ?? 'Customer'}</p>
              <p className="mt-1 text-[12px] leading-5" style={{ color: '#d1d5db' }}>
                {destAddress ?? (destLat != null && destLng != null ? 'GPS location saved' : 'Address not available')}
              </p>
              {destLat != null && destLng != null ? (
                <p className="mt-1 text-[10px]" style={{ color: '#9ca3af' }}>GPS pin: {destLat.toFixed(6)}, {destLng.toFixed(6)}</p>
              ) : (
                <p className="mt-1 text-[10px]" style={{ color: '#fbbf24' }}>Exact pin unavailable — this map uses the address only.</p>
              )}
            </div>
            {stage === 'to_dropoff' && customer?.phone && (
              <a href={`tel:${customer.phone}`} aria-label="Call customer" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: '#343434', color: '#ffffff' }}>
                <Phone size={20} aria-hidden="true" />
              </a>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3">
            {stage === 'to_dropoff' ? (
              <>
                <button type="button" onClick={() => { setCode(''); setError(null); setShowDeliveryCodeModal(true); }} disabled={busy}
                  className="w-full min-h-12 rounded-full px-4 py-3 text-[13px] font-semibold text-white disabled:opacity-50"
                  style={{ background: '#ff7900' }}>
                  Confirm delivery
                </button>
                <button type="button" onClick={() => setConfirmingCancel(true)} disabled={busy}
                  className="w-full min-h-11 rounded-full px-4 py-3 text-[13px] font-medium disabled:opacity-50"
                  style={{ background: '#24211e', color: '#ff6b5f', border: '1px solid #51433c' }}>
                  Cancel this delivery
                </button>
              </>
            ) : (
              <p className="rounded-xl px-4 py-3 text-center text-[12px]" style={{ background: '#24211e', color: '#e7e5e4' }}>
                Follow the map to the restaurant pickup.
              </p>
            )}
          </div>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl p-3 mb-3" style={{ background: '#fff0e8', color: '#b42318' }}><p className="text-[12px]">{error}</p><button type="button" onClick={() => void advance(stage === 'to_pickup' ? 'picked_up' : 'delivered')} disabled={busy} className="mt-2 rounded-lg px-3 py-2 text-[12px] font-semibold disabled:opacity-50" style={{ background: '#ff7900', color: '#fff' }}>Try again</button></div>}

      {stage === 'to_pickup' ? (
        <button onClick={() => advance('picked_up')} disabled={busy}
          className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40"
          style={{ background: 'var(--orange)' }}>
          {busy ? 'Updating…' : "I've picked up the order"}
        </button>
      ) : null}

      {showDeliveryCodeModal && stage === 'to_dropoff' && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-3" style={{ background: 'rgba(0,0,0,0.58)' }} role="presentation" onClick={(event) => { if (event.target === event.currentTarget && !busy) setShowDeliveryCodeModal(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="delivery-code-title" className="w-full max-w-md rounded-[22px] p-5 sm:p-6" style={{ background: '#fffaf6', color: '#211d19' }}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#ff7900' }}>Complete delivery</p>
                <h3 id="delivery-code-title" className="text-lg font-semibold">Confirm delivery code</h3>
                <p className="mt-1 text-sm" style={{ color: '#706b65' }}>Ask the customer for their 4-digit code to confirm the order was handed over.</p>
              </div>
              <button type="button" aria-label="Close dialog" disabled={busy} onClick={() => setShowDeliveryCodeModal(false)} className="rounded-full p-2 disabled:opacity-50"><X size={20} /></button>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); if (/^\d{4}$/.test(code) && !busy) void advance('delivered'); }}>
              <label htmlFor="delivery-code" className="block text-sm font-medium mb-2">Customer delivery code</label>
              <input id="delivery-code" autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Enter 4-digit code" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required
                className="w-full px-4 py-3 rounded-xl text-base outline-none mb-4 tracking-[0.3em]" style={{ border: '1px solid #ead9ca', color: '#211d19', background: '#ffffff' }} />
              {error && <p role="alert" className="mb-3 text-sm" style={{ color: '#b42318' }}>{error}</p>}
              <button type="submit" disabled={busy || !/^\d{4}$/.test(code)}
                className="w-full min-h-12 rounded-full px-4 py-3.5 text-[13.5px] font-semibold text-white disabled:opacity-50"
                style={{ background: busy || !/^\d{4}$/.test(code) ? '#d7a17b' : 'var(--orange)' }}>
                {busy ? 'Submitting…' : 'Confirm delivery'}
              </button>
              <button type="button" disabled={busy} onClick={() => setShowDeliveryCodeModal(false)} className="w-full min-h-11 py-3 mt-1 text-sm" style={{ color: '#706b65' }}>Back</button>
            </form>
          </section>
        </div>
      )}

      {confirmingCancel && (
        <CancelConfirm
          showPenalty={stage === 'to_dropoff'}
          penaltyPct={penaltyPct}
          busy={busy}
          onConfirm={cancelDelivery}
          onDismiss={() => setConfirmingCancel(false)}
        />
      )}
    </>
  );
}
