'use client';

import { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import useActiveLocations from '@/hooks/useActiveLocations';

interface LocationPickerProps {
  address?: string;
  lga?: string;
  onChange: (value: { address: string; lga?: string; latitude?: number; longitude?: number }) => void;
}

export default function LocationPicker({ address, lga, onChange }: LocationPickerProps) {
  const { latitude, longitude, address: detectedAddress, error, isLoading, requestLocation } = useGeolocation();
  const { locations, loading: locationsLoading } = useActiveLocations();
  const [manualMode, setManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState(address ?? '');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [confirmedManual, setConfirmedManual] = useState(false);
  const [confirmedAutoLat, setConfirmedAutoLat] = useState<number | null>(null);

  function handleAutoDetect() {
    requestLocation();
  }

  // Hand the result up once we have coordinates — the reverse-geocoded
  // address is a nice-to-have (falls back to a placeholder if
  // NEXT_PUBLIC_LOCATIONIQ_API_KEY isn't set), coordinates are what matters.
  if (latitude && longitude && latitude !== confirmedAutoLat) {
    setConfirmedAutoLat(latitude);
    onChange({
      address: detectedAddress ?? `Detected location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      lga,
      latitude,
      longitude,
    });
  }

  async function handleConfirmManual() {
    if (!manualAddress || !lga) return;
    setGeocoding(true);
    setGeocodeError(null);
    const key = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
    if (!key) {
      setGeocodeError('Location lookup is not configured — set NEXT_PUBLIC_LOCATIONIQ_API_KEY.');
      setGeocoding(false);
      return;
    }
    try {
      const query = encodeURIComponent(`${manualAddress}, ${lga}, Anambra, Nigeria`);
      const res = await fetch(`https://us1.locationiq.com/v1/search?key=${key}&q=${query}&format=json&limit=1`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setGeocodeError("Couldn't find that address — try adding a landmark or being more specific.");
        setGeocoding(false);
        return;
      }
      onChange({ address: manualAddress, lga, latitude: Number(data[0].lat), longitude: Number(data[0].lon) });
      setConfirmedManual(true);
    } catch {
      setGeocodeError('Location lookup failed — try again.');
    }
    setGeocoding(false);
  }

  return (
    <div>
      {!manualMode && (
        <button
          type="button"
          onClick={handleAutoDetect}
          disabled={isLoading}
          className="w-full py-3 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-2"
          style={{ background: 'var(--peach)', color: 'var(--ink)' }}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          {isLoading ? 'Detecting your location…' : 'Auto-detect my location'}
        </button>
      )}

      {error && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--gray)' }}>
          Couldn't detect your location automatically. Try entering it manually below.
        </p>
      )}

      {address && !manualMode && (
        <div className="mt-3 p-3 rounded-[9px]" style={{ border: '1px solid var(--line)' }}>
          <p className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{address}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setManualMode((m) => !m)}
        className="text-[11.5px] font-medium mt-2.5 underline"
        style={{ color: 'var(--gray)' }}
      >
        {manualMode ? 'Use auto-detect instead' : 'Enter address manually'}
      </button>

      {manualMode && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
              Street address
            </label>
            <input
              value={manualAddress}
              onChange={(e) => {
                setManualAddress(e.target.value);
                setConfirmedManual(false);
              }}
              placeholder="e.g. 12 Zik Avenue, Awka"
              className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
              Local Government Area
            </label>
            <select
              value={lga ?? ''}
              onChange={(e) => {
                onChange({ address: manualAddress, lga: e.target.value });
                setConfirmedManual(false);
              }}
              disabled={locationsLoading}
              className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none bg-white disabled:opacity-60"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              <option value="" disabled>{locationsLoading ? 'Loading LGAs…' : 'Select LGA'}</option>
              {locations.map(({ lga: name }) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {confirmedManual ? (
            <p className="text-[11.5px]" style={{ color: 'var(--green)' }}>✓ Location confirmed</p>
          ) : (
            <button
              type="button"
              onClick={handleConfirmManual}
              disabled={!manualAddress || !lga || geocoding}
              className="w-full py-2.5 rounded-[9px] text-[12.5px] font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--orange)' }}
            >
              {geocoding ? 'Looking up address…' : 'Confirm this location'}
            </button>
          )}
          {geocodeError && (
            <p className="text-[11px]" style={{ color: 'var(--red)' }}>{geocodeError}</p>
          )}
        </div>
      )}
    </div>
  );
}
