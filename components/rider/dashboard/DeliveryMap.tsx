'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function pin(color: string, size = 22) {
  return L.divIcon({
    className: 'bf-delivery-map-pin',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 8px #0004"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

function FocusDestination({ point }: { point: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(point, 17, { animate: false }); }, [map, point]);
  return null;
}

export default function DeliveryMap({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const destination = useMemo<[number, number] | null>(() =>
    latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)
      ? [latitude, longitude] : null, [latitude, longitude]);
  if (!destination) {
    return <div className="flex h-[300px] items-center justify-center px-6 text-center text-sm" style={{ background: '#f4f2ef', color: '#706b65' }}>
      Exact map pin unavailable. The destination needs saved GPS coordinates.
    </div>;
  }
  return (
    <div className="relative h-[300px] w-full">
      <MapContainer center={destination} zoom={17} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FocusDestination point={destination} />
        <Marker position={destination} icon={pin('#ff7900', 28)} />
        <Circle center={destination} radius={18} pathOptions={{ color: '#ff7900', weight: 1, fillColor: '#ff7900', fillOpacity: 0.12 }} />
      </MapContainer>
      <div className="absolute bottom-3 left-3 z-[500] rounded-full px-3 py-1.5 text-[11px] font-semibold shadow" style={{ background: '#fff', color: '#24211e' }}>
        Exact destination pin
      </div>
    </div>
  );
}
