'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';
import useRider from '@/hooks/useRider';
import useRiderActiveOrder from '@/hooks/useRiderActiveOrder';

type Offer = { offer_id: string; order_id: string; zone: string | null; status: string; offered_at: string; delivery_address: string | null; delivery_fee: number | null };

export default function NearbyOrdersPage() {
  const { rider, loading: riderLoading } = useRider();
  const { order: activeOrder, loading: orderLoading } = useRiderActiveOrder(rider?.id);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const swipeStart = useRef<number | null>(null);
  const [swipeProgress, setSwipeProgress] = useState<Record<string, number>>({});
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const load = useCallback(async (quiet = false) => {
    if (activeOrder) { setOffers([]); setLoading(false); return; }
    if (!quiet) setLoading(true);
    const { data, error } = await supabase.functions.invoke('dispatch-marketplace', { body: { action: 'rider_offers' } });
    if (error || data?.error) setMessage(data?.error ?? 'Could not load order offers. Please try again.');
    else {
      const fetchedOffers = (data?.offers ?? []) as Offer[];
      // Accepted offers must take priority even when the order row has not yet
      // been linked to rider_id; hide every other offer until this is resolved.
      const acceptedOffers = fetchedOffers.filter(offer => offer.status === 'accepted');
      setOffers(acceptedOffers.length ? acceptedOffers.slice(0, 1) : fetchedOffers);
      setMessage('');
    }
    setLoading(false);
  }, [supabase, activeOrder?.id]);

  useEffect(() => {
    if (!rider || orderLoading || activeOrder) { if (activeOrder) setOffers([]); return; }
    void load();
    if (rider.status !== 'online') return;
    const timer = setInterval(() => { void load(true); }, 10000);
    return () => clearInterval(timer);
  }, [rider?.id, rider?.status, load, orderLoading, activeOrder?.id]);

  async function respond(orderId: string, accept: boolean) {
    setBusy(orderId); setMessage('');
    const { data, error } = await supabase.functions.invoke('dispatch-marketplace', { body: { action: 'respond_offer', order_id: orderId, accept } });
    if (error || data?.error) { setMessage(data?.error ?? error?.message ?? 'Offer unavailable.'); await load(true); }
    else if (accept) router.push('/rider-portal/dashboard/delivery/' + orderId);
    else { setOffers(rows => rows.filter(row => row.order_id !== orderId)); setMessage('Offer rejected.'); }
    setBusy(null);
  }

  if (riderLoading || !rider || orderLoading) return <p className="py-8 text-center">Loading rider account…</p>;
  return <div className="space-y-4">
    <PageHeader title="Nearby orders" subtitle="Offers for paid orders in your service area" />
    {activeOrder ? <div className="rounded-2xl p-5" style={{ background: '#211E1B', color: 'white', border: '2px solid var(--orange)' }}><p className="text-xs font-semibold" style={{ color: '#FF9B4A' }}>PRIORITY · ACTIVE DELIVERY</p><h2 className="mt-2 text-lg font-semibold">{activeOrder.status === 'picked_up' ? 'On the way to drop-off' : activeOrder.status === 'preparing' ? 'Awaiting restaurant preparation' : 'Awaiting restaurant preparation'}</h2><p className="mt-3 text-sm" style={{ color: '#D0C9C2' }}>Destination</p><p className="mt-1 text-sm">{activeOrder.delivery_address ?? 'Open the delivery map to view the destination.'}</p><button onClick={() => router.push('/rider-portal/dashboard/delivery/' + activeOrder.id)} className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white" style={{ background: 'var(--orange)' }}>Open active delivery map</button><p className="mt-3 text-xs" style={{ color: '#D0C9C2' }}>Finish this delivery before accepting another order.</p></div> : null}
    {!activeOrder && message && <p role="alert" className="rounded-xl p-3 text-sm">{message}</p>}
    {!activeOrder && rider.status !== 'online' && <p className="rounded-xl p-3 text-sm">Go online from your dashboard to receive offers.</p>}
    {!activeOrder && (loading ? <p className="py-8 text-center">Loading offers…</p> : offers.length === 0 ?
      <div className="rounded-2xl border border-dashed p-7 text-center"><p className="font-medium">No nearby orders right now</p><p className="mt-2 text-sm">This list refreshes automatically while you are online.</p><button onClick={() => { setLoading(true); void load(); }} className="mt-4 rounded-lg px-4 py-2 text-sm text-white" style={{ background: 'var(--orange)' }}>Refresh</button></div> :
      offers.map(offer => <div key={offer.offer_id} className="rounded-2xl p-4 space-y-3" style={{ border: '1px solid var(--line)' }}>
        <div className="flex justify-between gap-3"><div><p className="font-semibold">Order {offer.order_id.slice(0, 8)}</p><p className="text-sm">{offer.zone ?? rider.zone ?? 'Service area'}</p><p className="text-xs opacity-70">{offer.status === 'accepted' ? 'Accepted' : 'Offer available'}</p></div><p className="font-semibold">₦{Number(offer.delivery_fee ?? 0).toLocaleString()}</p></div>
        <p className="text-sm">{offer.status === 'accepted' ? offer.delivery_address ?? 'Open delivery details for destination' : 'Delivery address is shared after acceptance.'}</p>
        {offer.status === 'offered' && <div className="space-y-3">
          <div
            role="button"
            tabIndex={0}
            aria-label="Swipe to accept order and open pickup map"
            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !busy && rider.status === 'online') void respond(offer.order_id, true); }}
            onPointerDown={e => { if (busy || rider.status !== 'online') return; swipeStart.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={e => { if (swipeStart.current === null) return; const progress = Math.max(0, Math.min(100, ((e.clientX - swipeStart.current) / Math.max(1, e.currentTarget.clientWidth)) * 100)); setSwipeProgress(s => ({ ...s, [offer.order_id]: progress })); }}
            onPointerUp={() => { const progress = swipeProgress[offer.order_id] ?? 0; swipeStart.current = null; setSwipeProgress(s => ({ ...s, [offer.order_id]: 0 })); if (progress >= 65 && !busy && rider.status === 'online') void respond(offer.order_id, true); }}
            onPointerCancel={() => { swipeStart.current = null; setSwipeProgress(s => ({ ...s, [offer.order_id]: 0 })); }}
            className="relative flex h-14 touch-pan-y select-none items-center overflow-hidden rounded-full px-2 text-sm font-semibold text-white"
            style={{ background: '#242424', opacity: busy || rider.status !== 'online' ? 0.55 : 1 }}
          >
            <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: (swipeProgress[offer.order_id] ?? 0) + '%', background: 'var(--orange)', opacity: 0.75 }} />
            <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-lg text-white" style={{ background: 'var(--orange)', transform: `translateX(${Math.max(0, ((swipeProgress[offer.order_id] ?? 0) / 100) * 180)}px)`, transition: swipeStart.current === null ? 'transform 180ms ease' : 'none' }}>➜</span>
            <span className="relative z-10 ml-3 flex-1 text-center pr-10">{busy === offer.order_id ? 'Accepting…' : 'Swipe to Accept Order'}</span>
          </div>
        </div>}
        {offer.status === 'accepted' && <button onClick={() => router.push('/rider-portal/dashboard/delivery/' + offer.order_id)} className="w-full rounded-lg p-2 text-sm text-white" style={{ background: 'var(--orange)' }}>Open delivery</button>}
      </div>))}
  </div>;
}
