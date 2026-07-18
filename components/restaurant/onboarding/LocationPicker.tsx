'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { ANAMBRA_LGAS, ANAMBRA_STATE_CENTER } from '@/lib/anambraLgas';

// Leaflet touches `window`, so it can't render during SSR.
const LocationMapPicker = dynamic(() => import('@/components/restaurant/onboarding/LocationMapPicker'), {
  ssr: false,
});

interface LocationPickerProps {
  address?: string;
  lga?: string;
  onChange: (value: { address: string; lga?: string; latitude?: number; longitude?: number }) => void;
}

export default function LocationPicker({ address, lga, onChange }: LocationPickerProps) {
  const {
    latitude,
    longitude,
    address: detectedAddress,
    outsideServiceArea: autoOutsideServiceArea,
    lgaGuess,
    error,
    isLoading,
    requestLocation,
    reset,
  } = useGeolocation();

  const [manualMode, setManualMode] = useState(false);
  const [streetAddress, setStreetAddress] = useState(address ?? '');
  const [landmark, setLandmark] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [manualOutsideServiceArea, setManualOutsideServiceArea] = useState(false);
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [confirmedManual, setConfirmedManual] = useState(false);
  const [confirmedAutoLat, setConfirmedAutoLat] = useState<number | null>(null);

  function handleAutoDetect() {
    reset();
    requestLocation();
  }

  // Hand the result up once we have coordinates that are actually inside
  // Anambra — outside-service-area detections are surfaced as a hard block
  // instead, never silently passed through.
  if (latitude && longitude && latitude !== confirmedAutoLat && !autoOutsideServiceArea) {
    setConfirmedAutoLat(latitude);
    setPinCoords({ lat: latitude, lng: longitude });
    onChange({
      address: detectedAddress ?? `Detected location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      lga: lga || lgaGuess || undefined,
      latitude,
      longitude,
    });
  }

  function handlePinMove(lat: number, lng: number) {
    setPinCoords({ lat, lng });
    onChange({
      address: manualMode ? streetAddress : (detectedAddress ?? `Pinned location (${lat.toFixed(4)}, ${lng.toFixed(4)})`),
      lga,
      latitude: lat,
      longitude: lng,
    });
  }

  async function handleConfirmManual() {
    if (!streetAddress || !lga) return;
    setGeocoding(true);
    setGeocodeError(null);
    setManualOutsideServiceArea(false);
    const key = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
    if (!key) {
      setGeocodeError('Location lookup is not configured — set NEXT_PUBLIC_LOCATIONIQ_API_KEY.');
      setGeocoding(false);
      return;
    }
    try {
      const fullAddress = landmark ? `${streetAddress}, near ${landmark}` : streetAddress;
      const query = encodeURIComponent(`${fullAddress}, ${lga}, Anambra, Nigeria`);
      const res = await fetch(
        `https://us1.locationiq.com/v1/search?key=${key}&q=${query}&format=json&limit=1&addressdetails=1`
      );
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setGeocodeError("Couldn't find that address — try adding a landmark or being more specific.");
        setGeocoding(false);
        return;
      }
      const result = data[0];
      const detectedState: string | undefined = result.address?.state;
      if (detectedState && !detectedState.toLowerCase().includes('anambra')) {
        setManualOutsideServiceArea(true);
        setGeocoding(false);
        return;
      }
      const lat = Number(result.lat);
      const lon = Number(result.lon);
      setPinCoords({ lat, lng: lon });
      onChange({ address: fullAddress, lga, latitude: lat, longitude: lon });
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
          {isLoading ? 'Detecting your precise location…' : 'Auto-detect my location'}
        </button>
      )}

      {error && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--gray)' }}>
          Couldn't detect your location automatically. Try entering it manually below.
        </p>
      )}

      {autoOutsideServiceArea && (
        <div className="mt-3 p-3 rounded-[9px] flex gap-2" style={{ background: '#FEF2F2' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--red)' }} />
          <p className="text-[12px]" style={{ color: 'var(--red)' }}>
            That location looks like it's outside Anambra. BigFoods only operates within Anambra State right now,
            so we can't continue with this location.
          </p>
        </div>
      )}

      {address && !manualMode && !autoOutsideServiceArea && (
        <div className="mt-3 p-3 rounded-[9px]" style={{ border: '1px solid var(--line)' }}>
          <p className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{address}</p>
        </div>
      )}

      {pinCoords && !manualMode && !autoOutsideServiceArea && (
        <div className="mt-3">
          <LocationMapPicker latitude={pinCoords.lat} longitude={pinCoords.lng} onMove={handlePinMove} />
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
              value={streetAddress}
              onChange={(e) => {
                setStreetAddress(e.target.value);
                setConfirmedManual(false);
                setManualOutsideServiceArea(false);
              }}
              placeholder="e.g. 12 Zik Avenue"
              className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
              Nearest landmark <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(optional, helps riders)</span>
            </label>
            <input
              value={landmark}
              onChange={(e) => {
                setLandmark(e.target.value);
                setConfirmedManual(false);
              }}
              placeholder="e.g. opposite First Bank"
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
                onChange({ address: streetAddress, lga: e.target.value });
                setConfirmedManual(false);
              }}
              className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none bg-white"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              <option value="" disabled>Select LGA</option>
              {ANAMBRA_LGAS.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {manualOutsideServiceArea && (
            <div className="p-3 rounded-[9px] flex gap-2" style={{ background: '#FEF2F2' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--red)' }} />
              <p className="text-[12px]" style={{ color: 'var(--red)' }}>
                That address looks like it's outside Anambra. BigFoods only operates within Anambra State right now.
              </p>
            </div>
          )}

          {confirmedManual ? (
            <p className="text-[11.5px]" style={{ color: 'var(--green)' }}>✓ Location confirmed</p>
          ) : (
            <button
              type="button"
              onClick={handleConfirmManual}
              disabled={!streetAddress || !lga || geocoding}
              className="w-full py-2.5 rounded-[9px] text-[12.5px] font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--orange)' }}
            >
              {geocoding ? 'Looking up address…' : 'Confirm this location'}
            </button>
          )}
          {geocodeError && (
            <p className="text-[11px]" style={{ color: 'var(--red)' }}>{geocodeError}</p>
          )}

          {confirmedManual && pinCoords && (
            <LocationMapPicker latitude={pinCoords.lat} longitude={pinCoords.lng} onMove={handlePinMove} />
          )}
        </div>
      )}
    </div>
  );
}
