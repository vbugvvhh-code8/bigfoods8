'use client';

import {useEffect, useMemo, useState} from 'react';
import {useGeolocation} from '@/hooks/useGeolocation';
import {useRestaurants} from '@/hooks/useRestaurants';
import {SearchBar} from '@/components/customer/home/SearchBar';
import {SearchSuggestions} from '@/components/customer/home/SearchSuggestions';
import {CategoryChips} from '@/components/customer/home/CategoryChips';
import {PromotedRow} from '@/components/customer/home/PromotedRow';
import {RestaurantList} from '@/components/customer/home/RestaurantList';
import {OrderTray} from '@/components/customer/menu/OrderTray';

export default function OrderHomePage() {
  const [category, setCategory] = useState('All');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const {latitude, longitude, nigerianState, requestLocation, isLoading: locating, error: locationError} = useGeolocation();
  const customerState = nigerianState ?? undefined;
  // Never block the list on location: if the customer ignores or denies the
  // prompt, or GPS is slow, show restaurants after a short wait anyway.
  const [locationWaitOver, setLocationWaitOver] = useState(false);

  useEffect(() => {
    requestLocation();
    const timer = window.setTimeout(() => setLocationWaitOver(true), 5000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasLocation = latitude != null && longitude != null;
  const waitingForLocation = !hasLocation && !locationError && !locationWaitOver;

  const {restaurants, isLoading, error} = useRestaurants({
    category,
    customerState,
    customerLat: latitude ?? undefined,
    customerLng: longitude ?? undefined,
  });
  const {restaurants: allForCategories} = useRestaurants({customerState});
  const {restaurants: promoted} = useRestaurants({
    featuredOnly: true,
    customerState,
    customerLat: latitude ?? undefined,
    customerLng: longitude ?? undefined,
  });

  const categories = useMemo(
    () => Array.from(new Set(allForCategories.map((r) => r.category).filter((c): c is string => !!c))).sort(),
    [allForCategories]
  );

  return (
    <div className="w-full max-w-[440px] lg:max-w-2xl mx-auto px-3 py-6">
      <PromotedRow restaurants={promoted} />
      <SearchBar onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
      <SearchSuggestions visible={showSuggestions} />
      <CategoryChips categories={categories} active={category} onChange={setCategory} />
      {/* Avoid flashing the unfiltered list while the initial location lookup is pending. */}
      {!hasLocation && !waitingForLocation && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-[13px]" style={{borderColor: 'var(--line)'}}>
          <span style={{color: 'var(--gray)'}}>Showing all restaurants. Share your location to see what&apos;s nearby.</span>
          <button
            type="button"
            onClick={() => requestLocation()}
            disabled={locating}
            className="shrink-0 rounded-lg px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{background: 'var(--orange, #F36B12)'}}
          >
            {locating ? 'Locating…' : 'Use my location'}
          </button>
        </div>
      )}
      <RestaurantList restaurants={restaurants} isLoading={isLoading || waitingForLocation} error={error} />
      <OrderTray />
    </div>
  );
}
