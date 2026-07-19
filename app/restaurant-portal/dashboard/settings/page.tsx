'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import PageHeader from '@/components/admin/layout/PageHeader';
import BannerUpload from '@/components/restaurant/onboarding/BannerUpload';
import BannerPreview from '@/components/restaurant/onboarding/BannerPreview';
import LocationPicker from '@/components/restaurant/onboarding/LocationPicker';
import useRestaurant from '@/hooks/useRestaurant';

const ZoneRadiusMap = dynamic(() => import('@/components/restaurant/onboarding/ZoneRadiusMap'), { ssr: false });

const CATEGORIES = ['Local & Native', 'Fast food', 'Drinks & snacks', 'Home kitchens'];
const MIN_RADIUS = 3;
const MAX_RADIUS = 30;

export default function SettingsPage() {
  const { restaurant, loading, save, refresh } = useRestaurant();

  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [address, setAddress] = useState('');
  const [lga, setLga] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [radiusKm, setRadiusKm] = useState(8);

  const [saving, setSaving] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Seed local edit state from the loaded restaurant exactly once — after
  // that, this form owns its own state until each section is saved.
  useEffect(() => {
    if (!loading && restaurant && !hydrated) {
      setName(restaurant.name ?? '');
      setCategory(restaurant.category ?? '');
      setBannerUrl(restaurant.image_url ?? '');
      setAddress(restaurant.address ?? '');
      setLga(restaurant.zone ?? '');
      setLatitude(restaurant.latitude ?? undefined);
      setLongitude(restaurant.longitude ?? undefined);
      setRadiusKm(restaurant.delivery_radius_km ?? 8);
      setHydrated(true);
    }
  }, [loading, restaurant, hydrated]);

  if (loading || !restaurant || !hydrated) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  async function handleSave(field: string, fields: Record<string, any>) {
    setSaving(field);
    setError(null);
    setSavedField(null);
    const result = await save(fields);
    setSaving(null);
    if (result) {
      setSavedField(field);
      refresh();
      setTimeout(() => setSavedField(null), 2500);
    } else {
      setError('Could not save — try again.');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Update anything from your original setup" />

      {error && (
        <p className="text-[11.5px] p-3 rounded-[9px]" style={{ background: '#FEF2F2', color: 'var(--red)' }}>
          {error}
        </p>
      )}

      {/* Business info */}
      <div className="p-4 rounded-[12px] space-y-3" style={{ border: '1px solid var(--line)', background: 'var(--white)' }}>
        <p className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>Business info</p>

        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Restaurant name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
            style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
          />
        </div>

        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className="px-3 py-1.5 rounded-full border text-[11.5px] font-medium"
                style={
                  category === cat
                    ? { background: 'var(--ink)', color: 'var(--white)', borderColor: 'var(--ink)' }
                    : { color: 'var(--gray)', borderColor: 'var(--line)' }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Banner photo</label>
          <BannerUpload previewUrl={bannerUrl} onUploaded={(url) => setBannerUrl(url)} />
          <BannerPreview bannerUrl={bannerUrl} restaurantName={name} category={category} />
        </div>

        <button
          onClick={() => handleSave('business', { name, category, image_url: bannerUrl })}
          disabled={saving === 'business'}
          className="w-full py-2.5 rounded-[9px] text-[12.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'var(--orange)' }}
        >
          {saving === 'business' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {savedField === 'business' ? '✓ Saved' : 'Save business info'}
        </button>
      </div>

      {/* Location */}
      <div className="p-4 rounded-[12px] space-y-3" style={{ border: '1px solid var(--line)', background: 'var(--white)' }}>
        <p className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>Location</p>
        <LocationPicker
          address={address}
          lga={lga}
          onChange={(v) => {
            setAddress(v.address);
            if (v.lga) setLga(v.lga);
            if (v.latitude) setLatitude(v.latitude);
            if (v.longitude) setLongitude(v.longitude);
          }}
        />
        <button
          onClick={() => handleSave('location', { address, zone: lga, latitude, longitude })}
          disabled={saving === 'location' || !address || !lga || !latitude || !longitude}
          className="w-full py-2.5 rounded-[9px] text-[12.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'var(--orange)' }}
        >
          {saving === 'location' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {savedField === 'location' ? '✓ Saved' : 'Save location'}
        </button>
      </div>

      {/* Delivery zone */}
      <div className="p-4 rounded-[12px] space-y-3" style={{ border: '1px solid var(--line)', background: 'var(--white)' }}>
        <p className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>Delivery radius</p>
        {latitude && longitude ? (
          <ZoneRadiusMap latitude={latitude} longitude={longitude} radiusKm={radiusKm} />
        ) : (
          <p className="text-[11.5px]" style={{ color: 'var(--gray)' }}>Set your location above first.</p>
        )}
        <div className="flex items-center justify-between mb-1">
          <label className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>Radius</label>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--orange)' }}>{radiusKm} km</span>
        </div>
        <input
          type="range"
          min={MIN_RADIUS}
          max={MAX_RADIUS}
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          className="w-full"
        />
        <button
          onClick={() => handleSave('delivery', { delivery_radius_km: radiusKm })}
          disabled={saving === 'delivery'}
          className="w-full py-2.5 rounded-[9px] text-[12.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'var(--orange)' }}
        >
          {saving === 'delivery' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {savedField === 'delivery' ? '✓ Saved' : 'Save delivery radius'}
        </button>
      </div>
    </div>
  );
}
