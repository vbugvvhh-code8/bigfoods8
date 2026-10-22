'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Navigation, Wallet, Bike, ArrowUpRight, Clock3, ShieldCheck } from 'lucide-react';
import useRider from '@/hooks/useRider';
import useRiderActiveOrder from '@/hooks/useRiderActiveOrder';
import useRiderWallet from '@/hooks/useRiderWallet';

const STATUS_LABEL: Record<string, string> = {
  placed: 'Awaiting restaurant preparation',
  preparing: 'Ready for pickup when restaurant finishes',
  picked_up: 'On the way to drop-off',
};

export default function RiderDashboardPage() {
  const { rider, setOnline, error } = useRider();
  const { order, loading: orderLoading } = useRiderActiveOrder(rider?.id);
  const { transactions } = useRiderWallet(rider?.id);
  const [toggling, setToggling] = useState(false);
  const [livePosition, setLivePosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState('Getting your live location…');

  const online = rider?.status === 'online';
  const missingZone = !rider?.zone;

  const todayEarnings = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return transactions
      .filter((t) => t.created_at && new Date(t.created_at) >= startOfDay)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

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
            <a
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold"
              style={{ color: 'var(--orange)' }}
              href={`https://www.openstreetmap.org/?mlat=${livePosition.lat}&mlon=${livePosition.lng}#map=17/${livePosition.lat}/${livePosition.lng}`}
              target="_blank"
              rel="noreferrer"
            ><MapPin className="h-3.5 w-3.5" /> View location on map <ArrowUpRight className="h-3 w-3" /></a>
          </div>
        ) : (
          <div className="mx-4 mb-4 rounded-xl p-3 text-xs" style={{ background: '#F7F4F0', color: 'var(--gray)' }}>
            Your location is needed to match nearby jobs accurately. Make sure location permission is enabled.
          </div>
        )}
      </section>

      {missingZone && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--peach)', color: '#6E5A46' }}>
          Your service area is not set, so nearby jobs may not match correctly. <Link href="/rider-portal/dashboard/profile" className="font-semibold underline">Set your service area</Link>.
        </div>
      )}

      {orderLoading ? (
        <section className="rounded-2xl p-5 text-sm" style={{ background: 'white', border: '1px solid var(--line)', color: 'var(--gray)' }}>Checking your active delivery…</section>
      ) : order ? (
        <Link href={`/rider-portal/dashboard/delivery/${order.id}`} className="block rounded-2xl p-4 sm:p-5" style={{ background: '#211E1B', color: 'white', border: '2px solid var(--orange)' }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: 'var(--orange)', color: 'white' }}><ShieldCheck className="h-3.5 w-3.5" /> PRIORITY · ACTIVE DELIVERY</span>
            <ArrowUpRight className="h-5 w-5 shrink-0" />
          </div>
          <h2 className="text-lg font-semibold">{STATUS_LABEL[order.status] ?? order.status}</h2>
          <p className="mt-2 text-sm" style={{ color: '#D0C9C2' }}>Destination</p>
          <p className="mt-1 text-sm">{order.delivery_address ?? 'Open delivery to view the destination and map.'}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: '#FF9B4A' }}><Navigation className="h-4 w-4" /> Open delivery map</p>
          <p className="mt-3 text-xs" style={{ color: '#D0C9C2' }}>Finish or pick up this delivery before taking another job.</p>
        </Link>
      ) : (
        <section className="rounded-2xl p-4 sm:p-5" style={{ background: 'white', border: '1px solid var(--line)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Jobs near you</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--gray)' }}>
                {online ? 'Eligible delivery jobs in your service area appear here when the admin allows riders to accept them.' : 'Go online to check for eligible delivery jobs.'}
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--peach)', color: 'var(--orange)' }}><MapPin className="h-5 w-5" /></div>
          </div>
          <Link href="/rider-portal/dashboard/nearby-orders" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white" style={{ background: 'var(--orange)' }}>
            Find available jobs <ArrowUpRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: 'var(--gray)' }}><Clock3 className="h-3.5 w-3.5" /> Job availability refreshes automatically while you are online.</p>
        </section>
      )}
    </div>
  );
}
