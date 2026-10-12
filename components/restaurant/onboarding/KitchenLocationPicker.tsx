'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { MapPin, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { lgaOptions } from '@/lib/nigeriaLocations';

const LocationMapPicker = dynamic(() => import('@/components/restaurant/onboarding/LocationMapPicker'), {
  ssr: false,
});

export interface KitchenLocationValue {
  address?: string;
  lga?: string;
  latitude?: number;
  longitude?: number;
}

interface Props extends KitchenLocationValue {
  state?: string;
  onChange: (value: KitchenLocationValue) => void;
}

/**
 * A kitchen needs BOTH a GPS pin (what riders navigate to) and a typed address
 * (what riders read). Neither replaces the other.
 */
export default function KitchenLocationPicker({ address, lga, state, latitude, longitude, onChange }: Props) {
  const geo = useGeolocation();
  const handled = useRef<number | null>(null);

  // When a fresh GPS fix arrives, store it as the pin.
  useEffect(() => {
    if (geo.latitude && geo.longitude && handled.current !== geo.latitude) {
      handled.current = geo.latitude;
      onChange({ address, lga, latitude: geo.latitude, longitude: geo.longitude });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.latitude, geo.longitude]);

  const hasPin = !!(latitude && longitude);
  const addressOk = (address ?? '').trim().length >= 8;

  return (
    <div className="space-y-5">
      <div className="p-3 rounded-[10px] flex gap-2" style={{ background: 'var(--peach)' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--orange)' }} />
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink)' }}>
          <strong>Use exact matches.</strong> Riders see your pin on a map and your written address together. Stand at
          your kitchen door when you tap the button, and type the address the way a rider would find it.
        </p>
      </div>

      <section aria-labelledby="pin-h">
        <h3 id="pin-h" className="text-[12.5px] font-semibold mb-1.5">1. Pin your kitchen</h3>
        <button
          type="button"
          onClick={() => {
            geo.reset();
            geo.requestLocation();
          }}
          disabled={geo.isLoading}
          className="w-full py-3 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-2"
          style={{ background: hasPin ? 'var(--white)' : 'var(--peach)', color: 'var(--ink)', border: '1px solid var(--line)' }}
        >
          {geo.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          {geo.isLoading ? 'Finding your exact spot…' : hasPin ? 'Detect again' : 'Detect my location'}
        </button>
        {geo.error && (
          <p className="text-[11.5px] mt-1.5 flex gap-1.5" style={{ color: 'var(--red)' }} role="alert">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            We could not get your location. Allow location access in your browser, then try again.
          </p>
        )}
        {hasPin && (
          <div className="mt-3">
            <p className="text-[11.5px] mb-1.5 flex items-center gap-1" style={{ color: 'var(--green)' }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Pin set. Drag it if it is slightly off.
            </p>
            <LocationMapPicker
              latitude={latitude!}
              longitude={longitude!}
              onMove={(lat, lng) => onChange({ address, lga, latitude: lat, longitude: lng })}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="addr-h">
        <h3 id="addr-h" className="text-[12.5px] font-semibold mb-1.5">2. Type your address</h3>
        <label htmlFor="kaddr" className="block text-[12px] font-medium mb-1.5">
          Street, number and nearest landmark
        </label>
        <textarea
          id="kaddr"
          rows={3}
          value={address ?? ''}
          onChange={(e) => onChange({ address: e.target.value, lga, latitude, longitude })}
          placeholder="e.g. 12 Zik Avenue, opposite First Bank, Awka"
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none resize-none"
          style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
        />
        <label htmlFor="klga" className="block text-[12px] font-medium mt-3 mb-1.5">
          Local government area
        </label>
        <select
          id="klga"
          value={lga ?? ''}
          onChange={(e) => onChange({ address, lga: e.target.value, latitude, longitude })}
          disabled={!state}
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none bg-white"
          style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
        >
          <option value="">{state ? 'Select LGA' : 'Choose your state first'}</option>
          {lgaOptions(state).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {address && !addressOk && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--red)' }}>Add a bit more detail so riders can find you.</p>
        )}
      </section>
    </div>
  );
}
