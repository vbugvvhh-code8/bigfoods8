'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Navigation, Wallet, Bike, ArrowUpRight, Clock3, ShieldCheck } from 'lucide-react';
import useRider from '@/hooks/useRider';
import useRiderActiveOrder from '@/hooks/useRiderActiveOrder';
import useRiderWallet from '@/hooks/useRiderWallet';
import getBrowserSupabase from '@/lib/supabase/client';

const STATUS_LABEL: Record<string, string> = {
  placed: 'Awaiting restaurant preparation',
  preparing: 'Ready for pickup when restaurant finishes',
  picked_up: 'On the way to drop-off',
};

type NearbyOffer = { offer_id: string; order_id: string; zone: string | null; status: string; offered_at: string; delivery_address: string | null; delivery_fee: number | null };

export default function RiderDashboardPage() {
  const { rider, setOnline, error } = useRider();
  const { order, loading: orderLoading } = useRiderActiveOrder(rider?.id);
  const { transactions } = useRiderWallet(rider?.id);
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [toggling, setToggling] = useState(false);
  const [livePosition, setLivePosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState('Getting your live location…');
  const [nearbyOffers, setNearbyOffers] = useState<NearbyOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerActionId, setOfferActionId] = useState<string | null>(null);
  const [offersMessage, setOffersMessage] = useState('');
  const swipeStart = useRef<number | null>(null);
  const [swipeProgress, setSwipeProgress] = useState<Record<string, number>>({});

  const online = rider?.status === 'online';
  const missingZone = !rider?.zone;

  const todayEarnings = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return transactions
      .filter((t) => t.created_at && new Date(t.created_at) >= startOfDay)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  const loadNearbyOffers = useCallback(async (quiet = false) => {
    if (!rider || rider.status !== 'online' || order) {
      setNearbyOffers([]);
      setOffersLoading(false);
      return;
    }
    if (!quiet) setOffersLoading(true);
    const { data, error: invokeError } = await supabase.functions.invoke('dispatch-marketplace', { body: { action: 'rider_offers' } });
    if (invokeError || data?.error) {
      setOffersMessage(data?.error ?? 'Could not load nearby jobs. Please refresh.');
    } else {
      const fetchedOffers = (data?.offers ?? []) as NearbyOffer[];
      // Only prioritize accepted offers whose order is still active and
      // assigned to this rider. Stale accepted rows for completed orders must
      // not suppress pending offers that the rider can actually accept.
      const acceptedOffers = fetchedOffers.filter(offer => offer.status === 'accepted');
      let currentOffers = fetchedOffers;
      if (acceptedOffers.length && rider?.id) {
        const { data: activeAcceptedOrders } = await supabase.from('orders')
          .select('id,status,rider_id')
          .in('id', acceptedOffers.map(offer => offer.order_id))
          .eq('rider_id', rider.id)
          .in('status', ['placed', 'preparing', 'picked_up']);
        const validAcceptedIds = new Set((activeAcceptedOrders ?? []).map(order => order.id));
        currentOffers = fetchedOffers.filter(offer => offer.status !== 'accepted' || validAcceptedIds.has(offer.order_id));
      }
      const currentAcceptedOffers = currentOffers.filter(offer => offer.status === 'accepted');
      setNearbyOffers(currentAcceptedOffers.length ? currentAcceptedOffers.slice(0, 1) : currentOffers);
      setOffersMessage('');
    }
    setOffersLoading(false);
  }, [rider?.id, rider?.status, order?.id, supabase]);

  useEffect(() => {
    if (!rider || order || rider.status !== 'online') {
      setNearbyOffers([]);
      return;
    }
    void loadNearbyOffers();
    const timer = window.setInterval(() => { void loadNearbyOffers(true); }, 10000);
    return () => window.clearInterval(timer);
  }, [rider?.id, rider?.status, order?.id, loadNearbyOffers]);

  async function respondToOffer(orderId: string, accept: boolean) {
    if (offerActionId) return;
    setOfferActionId(orderId);
    setOffersMessage('');
    const { data, error: invokeError } = await supabase.functions.invoke('dispatch-marketplace', {
      body: { action: 'respond_offer', order_id: orderId, accept },
    });
    if (invokeError || data?.error) {
      setOffersMessage(data?.error ?? invokeError?.message ?? 'This offer is no longer available.');
      await loadNearbyOffers(true);
    } else if (accept) {
      router.push('/rider-portal/dashboard/delivery/' + orderId);
    } else {
      setNearbyOffers(rows => rows.filter(row => row.order_id !== orderId));
      setOffersMessage('Offer declined.');
    }
    setOfferActionId(null);
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationMessage('Live location is not supported by this browser.');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLivePosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocationMessage('Live location updated');
      },
      () => setLocationMessage('Allow location access in your browser settings to show your live location.'),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    await setOnline(!online);
    setToggling(false);
  }

  return (
    <div className="space-y-5 pb-6">
      <section className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--ink)', color: 'white' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] mb-1" style={{ color: '#B8B0A8' }}>Delivery status</p>
            <h1 className="text-xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {online ? 'Open to any delivery' : 'Not accepting deliveries'}
            </h1>
            <p className="text-xs mt-1" style={{ color: '#C7C0B8' }}>
              {online ? 'You can receive eligible jobs in your service area.' : 'Switch on when you are ready to work.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={online}
            aria-label={online ? 'Go offline' : 'Go online'}
            onClick={handleToggle}
            disabled={toggling}
            className="relative h-8 w-[58px] shrink-0 rounded-full transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#211e1b]"
            style={{ background: online ? '#22A06B' : '#6B625B' }}
          >
            <span className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all" style={{ left: online ? '30px' : '4px' }} />
          </button>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl p-3 text-sm" style={{ background: '#FEF2F2', color: 'var(--red)' }}>{error}</div>}

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ background: 'white', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--gray)' }}><Wallet className="h-4 w-4" /> Today&apos;s earnings</div>
          <p className="text-2xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}>₦{todayEarnings.toLocaleString()}</p>
          <Link href="/rider-portal/dashboard/wallet" className="mt-2 inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--orange)' }}>View wallet <ArrowUpRight className="h-3 w-3" /></Link>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'white', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--gray)' }}><Bike className="h-4 w-4" /> Driver details</div>
          <p className="text-lg font-semibold capitalize" style={{ color: 'var(--ink)' }}>{rider?.vehicle_type ?? 'Vehicle not set'}</p>
          <p className="mt-1 text-xs truncate" style={{ color: 'var(--gray)' }}>{rider?.name ?? 'Rider'}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--line)', background: 'white' }}>
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>Your live location</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--gray)' }}>{locationMessage}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--peach)', color: 'var(--orange)' }}><Navigation className="h-5 w-5" /></div>
        </div>
        {livePosition ? (
          <div className="mx-4 mb-4 rounded-xl p-3" style={{ background: '#F7F4F0' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{livePosition.lat.toFixed(6)}, {livePosition.lng.toFixed(6)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--gray)' }}>GPS accuracy ±{Math.round(livePosition.accuracy)} m · updates as you move</p>
            <a className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--orange)' }} href={`https://www.openstreetmap.org/?mlat=${livePosition.lat}&mlon=${livePosition.lng}#map=17/${livePosition.lat}/${livePosition.lng}`} target="_blank" rel="noreferrer"><MapPin className="h-3.5 w-3.5" /> View location on map <ArrowUpRight className="h-3 w-3" /></a>
          </div>
        ) : (
          <div className="mx-4 mb-4 rounded-xl p-3 text-xs" style={{ background: '#F7F4F0', color: 'var(--gray)' }}>Your location is needed to match nearby jobs accurately. Make sure location permission is enabled.</div>
        )}
      </section>

      {missingZone && <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--peach)', color: '#6E5A46' }}>Your service area is not set, so nearby jobs may not match correctly. <Link href="/rider-portal/dashboard/profile" className="font-semibold underline">Set your service area</Link>.</div>}

      {orderLoading ? (
        <section className="rounded-2xl p-5 text-sm" style={{ background: 'white', border: '1px solid var(--line)', color: 'var(--gray)' }}>Checking your active delivery…</section>
      ) : order ? (
        <Link href={`/rider-portal/dashboard/delivery/${order.id}`} className="block rounded-2xl p-4 sm:p-5" style={{ background: '#211E1B', color: 'white', border: '2px solid var(--orange)' }}>
          <div className="flex items-center justify-between gap-3 mb-3"><span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: 'var(--orange)', color: 'white' }}><ShieldCheck className="h-3.5 w-3.5" /> PRIORITY · ACTIVE DELIVERY</span><ArrowUpRight className="h-5 w-5 shrink-0" /></div>
          <h2 className="text-lg font-semibold">{STATUS_LABEL[order.status] ?? order.status}</h2>
          <p className="mt-2 text-sm" style={{ color: '#D0C9C2' }}>Destination</p>
          <p className="mt-1 text-sm">{order.delivery_address ?? 'Open delivery to view the destination and map.'}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: '#FF9B4A' }}><Navigation className="h-4 w-4" /> Open delivery map</p>
          <p className="mt-3 text-xs" style={{ color: '#D0C9C2' }}>Finish or pick up this delivery before taking another job.</p>
        </Link>
      ) : (
        <section className="rounded-2xl p-4 sm:p-5" style={{ background: 'white', border: '1px solid var(--line)' }}>
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Jobs near you</h2><p className="mt-1 text-sm" style={{ color: 'var(--gray)' }}>{online ? 'Available paid orders in your service area. Accept one to open the delivery map.' : 'Go online to check for eligible delivery jobs.'}</p></div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--peach)', color: 'var(--orange)' }}><MapPin className="h-5 w-5" /></div>
          </div>
          {offersMessage && <p role="alert" className="mt-3 rounded-lg p-3 text-sm" style={{ background: 'var(--peach)', color: 'var(--red)' }}>{offersMessage}</p>}
          {!online ? <p className="mt-4 rounded-xl p-3 text-sm" style={{ background: '#F7F4F0', color: 'var(--gray)' }}>Switch to online to receive eligible jobs.</p> : offersLoading && nearbyOffers.length === 0 ? <p className="mt-4 rounded-xl p-3 text-sm" style={{ background: '#F7F4F0', color: 'var(--gray)' }}>Checking available jobs…</p> : nearbyOffers.length === 0 ? <div className="mt-4 rounded-xl p-3 text-sm" style={{ background: '#F7F4F0', color: 'var(--gray)' }}>No eligible offers right now. This list refreshes automatically.</div> : <div className="mt-4 space-y-3">
            {nearbyOffers.map(offer => <article key={offer.offer_id} className="rounded-xl p-3" style={{ border: '1px solid var(--line)', background: '#FFFAF5' }}>
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold" style={{ color: 'var(--ink)' }}>Order {offer.order_id.slice(0, 8)}</p><p className="mt-1 text-xs" style={{ color: 'var(--gray)' }}>{offer.zone ?? rider?.zone ?? 'Service area'} · {offer.status === 'accepted' ? 'Accepted' : 'Offer available'}</p></div><p className="font-semibold" style={{ color: 'var(--ink)' }}>₦{Number(offer.delivery_fee ?? 0).toLocaleString()}</p></div>
              <p className="mt-2 text-sm" style={{ color: 'var(--gray)' }}>{offer.status === 'accepted' ? offer.delivery_address ?? 'Open delivery to view destination.' : 'Delivery address is shown after acceptance.'}</p>
              {offer.status === 'offered' && <div
                role="button"
                tabIndex={0}
                aria-label="Swipe to accept order and open delivery map"
                onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !offerActionId && online) void respondToOffer(offer.order_id, true); }}
                onPointerDown={e => { if (offerActionId || !online) return; swipeStart.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
                onPointerMove={e => { if (swipeStart.current === null) return; const progress = Math.max(0, Math.min(100, ((e.clientX - swipeStart.current) / Math.max(1, e.currentTarget.clientWidth)) * 100)); setSwipeProgress(s => ({ ...s, [offer.order_id]: progress })); }}
                onPointerUp={() => { const progress = swipeProgress[offer.order_id] ?? 0; swipeStart.current = null; setSwipeProgress(s => ({ ...s, [offer.order_id]: 0 })); if (progress >= 65 && !offerActionId && online) void respondToOffer(offer.order_id, true); }}
                onPointerCancel={() => { swipeStart.current = null; setSwipeProgress(s => ({ ...s, [offer.order_id]: 0 })); }}
                className="relative mt-3 flex h-14 touch-pan-y select-none items-center overflow-hidden rounded-full px-2 text-sm font-semibold text-white"
                style={{ background: '#242424', opacity: offerActionId || !online ? 0.55 : 1 }}
              >
                <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: (swipeProgress[offer.order_id] ?? 0) + '%', background: 'var(--orange)', opacity: 0.8 }} />
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-white" style={{ background: 'var(--orange)', transform: `translateX(${Math.max(0, ((swipeProgress[offer.order_id] ?? 0) / 100) * 180)}px)`, transition: swipeStart.current === null ? 'transform 180ms ease' : 'none' }}>➜</span>
                <span className="relative z-10 ml-3 flex-1 text-center pr-10">{offerActionId === offer.order_id ? 'Accepting…' : 'Swipe to Accept Order'}</span>
              </div>}
              {offer.status === 'accepted' && <button onClick={() => router.push('/rider-portal/dashboard/delivery/' + offer.order_id)} className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white" style={{ background: 'var(--orange)' }}>Open delivery map</button>}
            </article>)}
          </div>}
          <Link href="/rider-portal/dashboard/nearby-orders" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>View all nearby orders <ArrowUpRight className="h-4 w-4" /></Link>
          <p className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: 'var(--gray)' }}><Clock3 className="h-3.5 w-3.5" /> Refreshes automatically while you are online.</p>
        </section>
      )}
    </div>
  );
}
