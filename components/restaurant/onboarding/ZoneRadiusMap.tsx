'use client';

import { MapContainer, TileLayer, Circle, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface ZoneRadiusMapProps {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export default function ZoneRadiusMap({ latitude, longitude, radiusKm }: ZoneRadiusMapProps) {
  const center: [number, number] = [latitude, longitude];

  return (
    <div className="w-full rounded-[12px] overflow-hidden" style={{ height: 220, border: '1px solid var(--line)' }}>
      <MapContainer center={center} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center} />
        <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: '#FF6A00', weight: 2, fillOpacity: 0.08 }} />
      </MapContainer>
    </div>
  );
}
