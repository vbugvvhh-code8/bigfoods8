'use client';

import L from 'leaflet';

export function createPinIcon(kind: 'rider' | 'destination') {
  const color = kind === 'rider' ? '#FF7A1A' : '#20201A';
  const html =
    kind === 'rider'
      ? `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>`
      : `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>`;
  return L.divIcon({html, className: 'bf-pin-icon', iconSize: [26, 26], iconAnchor: [13, 13]});
}
