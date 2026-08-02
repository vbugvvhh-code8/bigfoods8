'use client';

import {MapContainer, TileLayer, Marker, Polyline, useMap} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {useEffect} from 'react';
import {createPinIcon} from './mapIcons';
import type {BatchStop} from '@/hooks/useOrderTracking';

interface TrackingMapProps {
  riderPosition: [number, number] | null;
  /** The rider's current-leg target -- a restaurant while still collecting, the customer once picked up. */
  currentDestination: [number, number];
  /** Final drop-off point -- shown even when currentDestination is a restaurant, so the customer sees the whole trip. */
  finalDestination: [number, number];
  /** Other restaurants in this batch, for context on the full route (only present for multi-restaurant orders). */
  otherStops?: BatchStop[];
}

function FitBounds({points}: {points: [number, number][]}) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(points, {padding: [40, 40]});
  }, [map, points]);
  return null;
}

export default function TrackingMap({riderPosition, currentDestination, finalDestination, otherStops}: TrackingMapProps) {
  const stopPoints: [number, number][] = (otherStops ?? [])
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => [s.lat as number, s.lng as number]);

  const points = riderPosition
    ? [riderPosition, currentDestination, ...stopPoints, finalDestination]
    : [currentDestination, ...stopPoints, finalDestination];

  const routeLine = riderPosition ? [riderPosition, currentDestination] : [];

  return (
    <div className="w-full h-full relative">
      <MapContainer center={finalDestination} zoom={14} scrollWheelZoom={false} style={{height: '100%', width: '100%'}}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />

        {/* Final drop-off (your address) always shown, even mid-collection */}
        <Marker position={finalDestination} icon={createPinIcon('destination')} />

        {/* Other stops in this batch -- muted if already picked up, green if still pending */}
        {(otherStops ?? []).map((s) =>
          s.lat != null && s.lng != null ? (
            <Marker key={s.restaurantId} position={[s.lat, s.lng]} icon={createPinIcon(s.pickedUp ? 'stop-done' : 'stop-pending')} />
          ) : null
        )}

        {riderPosition && (
          <>
            <Marker position={riderPosition} icon={createPinIcon('rider')} />
            <Polyline positions={routeLine} pathOptions={{color: '#FF7A1A', weight: 3, dashArray: '6 6'}} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
