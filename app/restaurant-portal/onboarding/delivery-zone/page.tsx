'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { ONBOARDING_STEPS } from '@/hooks/useOnboardingSession';
import { estimateReachableRiders } from '@/lib/estimateReachableRiders';
import useRestaurant from '@/hooks/useRestaurant';

// Leaflet touches `window`, so it can't render during SSR.
const ZoneRadiusMap = dynamic(() => import('@/components/restaurant/onboarding/ZoneRadiusMap'), { ssr: false });

const MIN_RADIUS = 3;
const MAX_RADIUS = 30;
const BROAD_ZONE_THRESHOLD = 25; // wide enough it's effectively state-wide coverage

export default function DeliveryZonePage() {
  const router = useRouter();
  const { restaurant, loading: restaurantLoading, save, error: saveError } = useRestaurant();
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveRadius = radiusKm ?? restaurant?.delivery_radius_km ?? MIN_RADIUS;
  const reachableRiders = estimateReachableRiders(effectiveRadius);

  if (restaurantLoading) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  if (!restaurant?.latitude || !restaurant?.longitude) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Set your location in the previous step first.
      </p>
    );
  }

  const isBroadZone = effectiveRadius >= BROAD_ZONE_THRESHOLD;

  async function handleContinue() {
    setSaving(true);
    const result = await save({ delivery_radius_km: effectiveRadius });
    setSaving(false);
    if (result) router.push(ONBOARDING_STEPS[4].path);
  }

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        Step 4 of 6
      </p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Set your delivery zone
      </h2>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--gray)' }}>
        BigFoods Dispatch handles every delivery — no delivery staff required.
      </p>

      <ZoneRadiusMap latitude={restaurant.latitude} longitude={restaurant.longitude} radiusKm={effectiveRadius} />

      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>
            Delivery radius
          </label>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--orange)' }}>
            {effectiveRadius} km
          </span>
        </div>
        <input
          type="range"
          min={MIN_RADIUS}
          max={MAX_RADIUS}
          value={effectiveRadius}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="mt-3 p-3 rounded-[9px]" style={{ background: 'var(--peach)' }}>
        <p className="text-[12px]" style={{ color: 'var(--ink)' }}>
          {reachableRiders} riders across our network can reach this zone.
        </p>
        <p className="text-[11px] mt-1" style={{ color: 'var(--gray)' }}>
          This is just informational, not a hard limit. You can adjust this anytime later.
        </p>
      </div>

      {isBroadZone && (
        <div className="mt-3 p-3 rounded-[9px]" style={{ background: 'var(--peach)', border: '1px solid var(--orange)' }}>
          <p className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>
            That's a wide coverage area
          </p>
          <p className="text-[11.5px] mt-1" style={{ color: 'var(--gray)' }}>
            Food traveling this far can arrive cold. Consider a tighter radius for the best customer experience.
          </p>
        </div>
      )}

      <div className="mt-3 p-3 rounded-[9px]" style={{ border: '1px solid var(--line)' }}>
        <p className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>BigFoods Dispatch</p>
        <p className="text-[11.5px] mt-1" style={{ color: 'var(--gray)' }}>
          Every order is delivered by a BigFoods rider. There's no self-delivery option.
        </p>
      </div>

      {saveError && (
        <p className="text-[11px] mt-3" style={{ color: 'var(--red)' }}>
          {saveError}
        </p>
      )}

      <button
        onClick={handleContinue}
        disabled={saving}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white mt-5 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: 'var(--orange)' }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Continue
      </button>
    </>
  );
}
