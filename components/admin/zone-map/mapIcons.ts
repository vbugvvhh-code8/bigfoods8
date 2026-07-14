'use client';

import L from 'leaflet';

// Real rider status values are 'online' / 'offline' — not 'available' / 'busy'.
export function createRiderDivIcon(status: string, label: string | null = null) {
  const color = status === 'online' ? '#1E9E5A' : '#9e9e9e';
  const text = label ? `<div style="font-size:10px;line-height:10px">${label}</div>` : '';
  const html = `
    <div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:${color};box-shadow:0 1px 3px rgba(0,0,0,0.2);color:white;font-size:11px;font-weight:600">${text || '●'}</div>
  `;
  return L.divIcon({ html, className: 'rider-icon', iconSize: [26, 26], iconAnchor: [13, 13] });
}
