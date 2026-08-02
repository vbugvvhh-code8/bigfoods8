'use client';

import L from 'leaflet';

export function createPinIcon(kind: 'rider' | 'destination' | 'stop-done' | 'stop-pending') {
  const colors: Record<typeof kind, string> = {
    rider: '#FF7A1A',
    destination: '#20201A',
    'stop-done': '#9C948A',
    'stop-pending': '#1F6E5C',
  };
  const color = colors[kind];
  const size = kind === 'rider' ? 26 : kind === 'destination' ? 16 : 14;
  const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>`;
  return L.divIcon({html, className: 'bf-pin-icon', iconSize: [size, size], iconAnchor: [size / 2, size / 2]});
}
