'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Point = [number, number];

function pin(color: string, size = 22, label?: string) {
  return L.divIcon({
    className: 'bf-delivery-map-pin',
    html: `<div title="${label ?? ''}" style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 8px #0004"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

const destinationIcon = pin('#ff7900', 28, 'Destination');
const riderIcon = L.divIcon({
  className: 'bf-rider-live-pin',
  html: '<div style="width:20px;height:20px;border-radius:50%;background:#2563eb;border:4px solid white;box-shadow:0 0 0 7px #2563eb33,0 2px 8px #0005"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function MapViewport({ destination, rider }: { destination: Point; rider: Point | null }) {
  const map = useMap();
  useEffect(() => {
    if (rider) {
      const bounds = L.latLngBounds([destination, rider]);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16, animate: true });
    } else {
      map.setView(destination, 17, { animate: true });
    }
  }, [map, destination, rider]);
  return null;
}

function formatDistance(metres: number) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

function distanceBetween(a: Point, b: Point) {
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function DeliveryMap({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const destination = useMemo<Point | null>(() =>
    latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)
      && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
      ? [latitude, longitude] : null, [latitude, longitude]);
  const [rider, setRider] = useState<Point | null>(null);
  const [gpsState, setGpsState] = useState<'waiting' | 'active' | 'denied' | 'unavailable' | 'unsupported'>('waiting');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [route, setRoute] = useState<Point[]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [routeState, setRouteState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsState('unsupported');
      return;
    }
    setGpsState('waiting');
    const watchId = navigator.geolocation.watchPosition(
      position => {
        setRider([position.coords.latitude, position.coords.longitude]);
        setAccuracy(position.coords.accuracy);
        setGpsState('active');
      },
      error => setGpsState(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const loadRoute = useCallback(async (from: Point, to: Point) => {
    setRouteState('loading');
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=false`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Routing service unavailable');
      const result = await response.json();
      const best = result?.routes?.[0];
      if (!best?.geometry?.coordinates?.length) throw new Error('No route found');
      setRoute(best.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as Point));
      setRouteDistance(best.distance);
      setRouteDuration(best.duration);
      setRouteState('ready');
    } catch {
      setRoute([]);
      setRouteDistance(null);
      setRouteDuration(null);
      setRouteState('unavailable');
    }
  }, []);

  useEffect(() => {
    if (!rider || !destination) return;
    const timer = window.setTimeout(() => { void loadRoute(rider, destination); }, 700);
    return () => window.clearTimeout(timer);
  }, [rider, destination, loadRoute]);

  const straightLine = rider && destination ? distanceBetween(rider, destination) : null;
  if (!destination) {
    return <div className="flex h-[300px] items-center justify-center px-6 text-center text-sm" style={{ background: '#f4f2ef', color: '#706b65' }}>
      Exact map pin unavailable. The destination needs saved GPS coordinates.
    </div>;
  }

  const gpsMessage = {
    waiting: 'Getting your GPS location…',
    active: accuracy != null && accuracy > 100 ? 'GPS active · accuracy is limited' : 'Your live location is on',
    denied: 'Location permission is blocked. Allow location access in your browser settings.',
    unavailable: 'Your location is unavailable. Check GPS and try again.',
    unsupported: 'This browser does not support live GPS.',
  }[gpsState];

  return (
    <div className="w-full">
      <div className="relative h-[320px] w-full">
        <MapContainer center={destination} zoom={15} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapViewport destination={destination} rider={rider} />
          {route.length > 0 && <Polyline positions={route} pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.88 }} />}
          <Marker position={destination} icon={destinationIcon} />
          <Circle center={destination} radius={18} pathOptions={{ color: '#ff7900', weight: 1, fillColor: '#ff7900', fillOpacity: 0.12 }} />
          {rider && <><Marker position={rider} icon={riderIcon} /><Circle center={rider} radius={accuracy ?? 25} pathOptions={{ color: '#2563eb', weight: 1, fillColor: '#2563eb', fillOpacity: 0.08 }} /></>}
        </MapContainer>
        <div className="absolute left-3 top-3 z-[500] flex flex-wrap gap-2">
          <span className="rounded-full px-3 py-1.5 text-[11px] font-semibold shadow" style={{ background: '#fff', color: '#2563eb' }}>● You</span>
          <span className="rounded-full px-3 py-1.5 text-[11px] font-semibold shadow" style={{ background: '#fff', color: '#ff7900' }}>● Destination</span>
        </div>
      </div>
      <div className="px-4 py-3" style={{ background: '#24211e', color: '#fff' }}>
        <p className="text-[12px] font-semibold">{gpsMessage}</p>
        {gpsState === 'active' && accuracy != null && <p className="mt-1 text-[10px]" style={{ color: '#d1d5db' }}>GPS accuracy ±{Math.round(accuracy)} m</p>}
        {rider && straightLine != null && <p className="mt-1 text-[12px]" style={{ color: '#e7e5e4' }}>Straight-line distance: {formatDistance(straightLine)}</p>}
        {gpsState === 'active' && (
          routeState === 'ready' && routeDistance != null && routeDuration != null
            ? <p className="mt-1 text-[13px] font-semibold" style={{ color: '#93c5fd' }}>Driving route: {formatDistance(routeDistance)} · about {Math.max(1, Math.round(routeDuration / 60))} min</p>
            : routeState === 'loading'
              ? <p className="mt-1 text-[11px]" style={{ color: '#d1d5db' }}>Calculating driving route…</p>
              : <p className="mt-1 text-[11px]" style={{ color: '#fbbf24' }}>Driving route unavailable right now. The destination pin and your live location are still shown.</p>
        )}
      </div>
    </div>
  );
}
