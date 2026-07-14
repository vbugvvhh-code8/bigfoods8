'use client';

import dynamic from 'next/dynamic';
import TopZonesPanel from './TopZonesPanel';
import LiveRidersPanel from './LiveRidersPanel';
import useRiderFeed from '@/hooks/useRiderFeed';

const ZoneMap = dynamic(() => import('./ZoneMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center rounded-[9px] text-[12px]" style={{ height: 460, background: 'var(--peach)', color: 'var(--gray)' }}>
      Loading map…
    </div>
  ),
});

export default function ZoneMapView({ zones = [], loading = false, error }: any) {
  // useRiderFeed gives real-time riders (name/status) — used for the side panel list only.
  // It can't drive map pins yet since riders have no lat/lng in the schema.
  const liveRiders = useRiderFeed();

  if (error) {
    return (
      <div className="rounded-xl p-4 text-[13px]" style={{ background: '#FBEAEA', color: '#C1453A', border: '1px solid #F0C6C6' }}>
        Couldn't load zone data — {error.message ?? 'please try refreshing.'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Zone Map
        </h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--gray)' }}>
          Restaurant and rider density across Anambra State
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3.5">
        <div className="rounded-xl p-3.5" style={{ background: 'white', border: '1px solid var(--line)' }}>
          {loading ? (
            <div className="flex items-center justify-center rounded-[9px] text-[12px]" style={{ height: 460, background: 'var(--peach)', color: 'var(--gray)' }}>
              Loading zones…
            </div>
          ) : (
            <ZoneMap zones={zones} riders={liveRiders ?? []} />
          )}
        </div>
        <div className="flex flex-col gap-3.5">
          <TopZonesPanel zones={zones} />
          <LiveRidersPanel riders={liveRiders ?? []} />
        </div>
      </div>
    </div>
  );
}
