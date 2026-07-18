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
  const {latitude, longitude, requestLocation} = useGeolocation();

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {restaurants, isLoading, error} = useRestaurants({
    category,
    customerLat: latitude ?? undefined,
    customerLng: longitude ?? undefined,
  });
  const {restaurants: allForCategories} = useRestaurants({});
  const {restaurants: promoted} = useRestaurants({
    featuredOnly: true,
    customerLat: latitude ?? undefined,
    customerLng: longitude ?? undefined,
  });

  const categories = useMemo(
    () => Array.from(new Set(allForCategories.map((r) => r.category).filter((c): c is string => !!c))).sort(),
    [allForCategories]
  );

  return (
    <div className="w-full max-w-[380px] lg:max-w-2xl mx-auto px-4 py-6">
      <SearchBar onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
      <SearchSuggestions visible={showSuggestions} />
      <CategoryChips categories={categories} active={category} onChange={setCategory} />
      {category === 'All' && <PromotedRow restaurants={promoted} />}
      <RestaurantList restaurants={restaurants} isLoading={isLoading} error={error} />
      <OrderTray />
    </div>
  );
}
