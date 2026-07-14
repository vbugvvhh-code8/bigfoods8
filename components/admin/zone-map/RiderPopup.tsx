'use client';

import React from 'react';

export default function RiderPopup({ rider }: any) {
  return (
    <div style={{ minWidth: 160 }}>
      <div style={{ fontWeight: 700 }}>{rider?.name ?? 'Rider'}</div>
      <div style={{ color: rider?.status === 'online' ? '#1E9E5A' : '#8C8681', fontSize: 12, fontWeight: 600 }}>
        {rider?.status === 'online' ? 'Online' : 'Offline'}
      </div>
      {rider?.last_location_update && (
        <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
          Updated {new Date(rider.last_location_update).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
