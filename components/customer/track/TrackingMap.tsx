'use client';

import {MapContainer, TileLayer, Marker, Polyline, useMap} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {useEffect} from 'react';
import {createPinIcon} from './mapIcons';

interface TrackingMapProps {
  riderPosition: [number, number] | null;
  destinationPosition: [number, number];
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

export default function TrackingMap({riderPosition, destinationPosition}: TrackingMapProps) {
  const points = riderPosition ? [riderPosition, destinationPosition] : [destinationPosition];

  return (
    <div className="w-full h-full relative">
      <MapContainer center={destinationPosition} zoom={14} scrollWheelZoom={false} style={{height: '100%', width: '100%'}}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        <Marker position={destinationPosition} icon={createPinIcon('destination')} />
        {riderPosition && (
          <>
            <Marker position={riderPosition} icon={createPinIcon('rider')} />
            <Polyline positions={[riderPosition, destinationPosition]} pathOptions={{color: '#FF7A1A', weight: 3, dashArray: '6 6'}} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
