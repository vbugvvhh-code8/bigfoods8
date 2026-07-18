'use client';

import dynamic from 'next/dynamic';
import {Navigation} from 'lucide-react';

const TrackingMap = dynamic(() => import('./TrackingMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-[12px]" style={{background: 'var(--peach)', color: 'var(--gray)'}}>
      Loading map…
    </div>
  ),
});

interface TrackingMapViewProps {
  riderPosition: [number, number] | null;
  destinationPosition: [number, number];
  distanceKm: number | null;
  etaMinutes: number | null;
  lastUpdatedLabel: string | null;
}

export function TrackingMapView({
  riderPosition,
  destinationPosition,
  distanceKm,
  etaMinutes,
  lastUpdatedLabel,
}: TrackingMapViewProps) {
  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{height: 220}}>
      <TrackingMap riderPosition={riderPosition} destinationPosition={destinationPosition} />

      {riderPosition && distanceKm != null && (
        <div
          className="absolute top-2.5 left-2.5 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 bg-white"
          style={{boxShadow: '0 4px 12px rgba(32,28,26,0.15)'}}
        >
          <Navigation className="w-3.5 h-3.5" style={{color: 'var(--orange)'}} />
          <span className="text-[11.5px] font-semibold" style={{color: 'var(--ink)'}}>
            {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`}
            {etaMinutes != null && ` · ~${etaMinutes} min`}
          </span>
        </div>
      )}

      {!riderPosition && (
        <div
          className="absolute top-2.5 left-2.5 rounded-lg px-2.5 py-1.5 bg-white text-[11.5px] font-medium"
          style={{boxShadow: '0 4px 12px rgba(32,28,26,0.15)', color: 'var(--gray)'}}
        >
          Waiting for a rider to be assigned…
        </div>
      )}

      {lastUpdatedLabel && riderPosition && (
        <div
          className="absolute bottom-2.5 left-2.5 rounded-lg px-2 py-1 bg-white text-[10px] font-medium"
          style={{boxShadow: '0 4px 12px rgba(32,28,26,0.15)', color: 'var(--gray)'}}
        >
          Rider location updated {lastUpdatedLabel}
        </div>
      )}
    </div>
  );
}
