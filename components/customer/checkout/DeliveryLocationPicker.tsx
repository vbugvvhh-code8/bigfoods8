'use client';

import {useState} from 'react';
import {MapPin, LocateFixed, Check, Bookmark} from 'lucide-react';
import {useGeolocation} from '@/hooks/useGeolocation';
import {useSavedAddresses} from '@/hooks/useSavedAddresses';

export interface DeliveryPoint {
  lat: number;
  lng: number;
  label: string;
  id?: string;
}

interface DeliveryLocationPickerProps {
  selected: DeliveryPoint | null;
  onSelect: (point: DeliveryPoint) => void;
  note: string;
  onNoteChange: (value: string) => void;
}

export function DeliveryLocationPicker({selected, onSelect, note, onNoteChange}: DeliveryLocationPickerProps) {
  const {latitude, longitude, isLoading, error, requestLocation} = useGeolocation();
  const {addresses, saveAddress} = useSavedAddresses();
  const [namingOpen, setNamingOpen] = useState(false);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const hasLiveLocation = latitude != null && longitude != null;

  const handleUseCurrent = () => {
    if (!hasLiveLocation) return;
    onSelect({lat: latitude!, lng: longitude!, label: 'Current location'});
  };

  const handleSaveCurrent = async () => {
    if (!hasLiveLocation || !name.trim()) return;
    setIsSaving(true);
    const saved = await saveAddress(name.trim(), latitude!, longitude!);
    setIsSaving(false);
    if (saved) {
      onSelect({lat: saved.lat, lng: saved.lng, label: saved.label, id: saved.id});
      setNamingOpen(false);
      setName('');
    }
  };

  return (
    <div className="rounded-xl p-3.5 mt-4" style={{background: 'var(--peach)'}}>
      <div className="flex items-center gap-2 mb-2.5">
        <MapPin className="w-4 h-4" style={{color: 'var(--orange)'}} />
        <span className="font-semibold text-[12.5px]" style={{color: 'var(--ink)'}}>
          Delivery location
        </span>
      </div>

      {addresses.length > 0 && (
        <div className="space-y-1.5 mb-2.5">
          {addresses.map((addr) => {
            const isSelected = selected?.id === addr.id;
            return (
              <button
                key={addr.id}
                onClick={() => onSelect({lat: addr.lat, lng: addr.lng, label: addr.label, id: addr.id})}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 bg-white text-left"
                style={isSelected ? {border: '1.5px solid var(--orange)'} : {border: '1.5px solid transparent'}}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Bookmark className="w-3.5 h-3.5 flex-shrink-0" style={{color: 'var(--orange)'}} />
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold truncate" style={{color: 'var(--ink)'}}>
                      {addr.label}
                    </div>
                    {addr.address && (
                      <div className="text-[10.5px] truncate" style={{color: 'var(--gray)'}}>
                        {addr.address}
                      </div>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 flex-shrink-0" style={{color: 'var(--orange)'}} />}
              </button>
            );
          })}
        </div>
      )}

      {!hasLiveLocation ? (
        <button
          onClick={requestLocation}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-60"
          style={{background: 'var(--orange)'}}
        >
          <LocateFixed className="w-4 h-4" />
          {isLoading ? 'Getting your location…' : addresses.length > 0 ? 'Or use current location' : 'Use my current location'}
        </button>
      ) : (
        <div className="space-y-1.5">
          <button
            onClick={handleUseCurrent}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 bg-white text-left"
            style={selected?.label === 'Current location' ? {border: '1.5px solid var(--orange)'} : {border: '1.5px solid transparent'}}
          >
            <span className="text-[12px] font-semibold" style={{color: 'var(--ink)'}}>
              📍 Order here (current location)
            </span>
            {selected?.label === 'Current location' && <Check className="w-4 h-4" style={{color: 'var(--orange)'}} />}
          </button>

          {!namingOpen ? (
            <button onClick={() => setNamingOpen(true)} className="w-full text-left text-[11.5px] font-medium px-3 py-1.5" style={{color: 'var(--orange-dark)'}}>
              + Save this location
            </button>
          ) : (
            <div className="flex gap-2 px-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Home, Office"
                className="flex-1 rounded-lg px-3 py-2 text-[12px] outline-none bg-white"
                style={{color: 'var(--ink)'}}
                autoFocus
              />
              <button
                onClick={handleSaveCurrent}
                disabled={!name.trim() || isSaving}
                className="px-3 rounded-lg text-[12px] font-semibold text-white disabled:opacity-50"
                style={{background: 'var(--orange)'}}
              >
                {isSaving ? '…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px] mt-2" style={{color: 'var(--red, #C1453A)'}}>
          {error}
        </p>
      )}

      <input
        type="text"
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Add a note for the rider (e.g. gate colour, floor)"
        className="w-full mt-2.5 bg-white rounded-lg px-3 py-2 text-[12px] outline-none"
        style={{color: 'var(--ink)'}}
      />
    </div>
  );
}
