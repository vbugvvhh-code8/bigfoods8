'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet's default marker icon paths get broken by most bundlers unless
// pointed at the CDN assets explicitly.
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationMapPickerProps {
  latitude: number;
  longitude: number;
  onMove: (lat: number, lng: number) => void;
}

function ClickToPlace({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationMapPicker({ latitude, longitude, onMove }: LocationMapPickerProps) {
  const center: [number, number] = [latitude, longitude];

  return (
    <div>
      <div className="w-full rounded-[12px] overflow-hidden" style={{ height: 220, border: '1px solid var(--line)' }}>
        <MapContainer center={center} zoom={15} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={center}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng();
                onMove(pos.lat, pos.lng);
              },
            }}
          />
          <ClickToPlace onMove={onMove} />
        </MapContainer>
      </div>
      <p className="text-[11px] mt-1.5" style={{ color: 'var(--gray)' }}>
        Drag the pin or tap the map to fine-tune your exact spot.
      </p>
    </div>
  );
}
