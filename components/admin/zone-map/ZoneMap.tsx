'use client';

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './zone-map.css';

import { createRiderDivIcon } from './mapIcons';
import RiderPopup from './RiderPopup';

// Zone-level density circles centered on known city coordinates (real zone_activity counts).
const ZONE_COORDINATES: Record<string, [number, number]> = {
  Awka: [6.2120, 7.0740],
  Onitsha: [6.1450, 6.7898],
  Nnewi: [6.0169, 6.9160],
  Ekwulobia: [6.0538, 7.0621],
  Ihiala: [5.8583, 6.8578],
};

const DEFAULT_CENTER: [number, number] = [6.15, 6.95];

export default function ZoneMap({ zones = [], riders = [] }: any) {
  const circles = useMemo(() => {
    return (zones || [])
      .map((z: any) => {
        const coords = ZONE_COORDINATES[z.zone];
        if (!coords) return null;
        return {
          zone: z.zone,
          coords,
          restaurantCount: z.restaurant_count ?? 0,
          ridersOnline: z.riders_online ?? 0,
        };
      })
      .filter(Boolean);
  }, [zones]);

  // Real rider pins — only riders with actual lat/lng show up (some may not have
  // reported a location yet, which is honest, not a bug).
  const riderMarkers = useMemo(() => {
    return (riders || [])
      .filter((r: any) => typeof r.lat === 'number' || typeof r.lat === 'string')
      .map((r: any) => {
        const lat = Number(r.lat);
        const lng = Number(r.lng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        return { id: r.id, position: [lat, lng] as [number, number], rider: r };
      })
      .filter(Boolean);
  }, [riders]);

  return (
    <div className="w-full admin-zone-map" style={{ height: 460 }}>
      <MapContainer center={DEFAULT_CENTER} zoom={9} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {circles.map((c: any) => (
          <Circle
            key={c.zone}
            center={c.coords}
            radius={Math.max(c.restaurantCount, 1) * 90}
            pathOptions={{ color: '#FF6A00', fillColor: '#FF6A00', fillOpacity: 0.2, weight: 1.5 }}
          >
            <Tooltip>{c.zone} · {c.restaurantCount} restaurants · {c.ridersOnline} riders online</Tooltip>
          </Circle>
        ))}

        {riderMarkers.map((m: any) => (
          <Marker key={m.id} position={m.position} icon={createRiderDivIcon(m.rider.status)}>
            <Popup>
              <RiderPopup rider={m.rider} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
