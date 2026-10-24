'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import { CalendarDays, ArrowRight } from 'lucide-react';
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
  const {latitude, longitude, nigerianState, requestLocation} = useGeolocation();
  const customerState = nigerianState ?? undefined;

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="w-full max-w-[380px] lg:max-w-2xl mx-auto px-4 py-6">
      <Link href="/subscriptions" className="mb-5 flex items-center justify-between gap-3 rounded-2xl border p-4 transition hover:shadow-sm" style={{borderColor:'#FED7AA',background:'linear-gradient(110deg,#FFF7ED,#FFFFFF)'}}>
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{background:'#FFEDD5',color:'#C2410C'}}><CalendarDays className="h-5 w-5"/></span>
          <span className="min-w-0"><span className="block text-sm font-bold" style={{color:'#9A3412'}}>Meal subscriptions</span><span className="mt-0.5 block text-xs" style={{color:'#7C5A46'}}>Choose your delivery days and prepay for a meal package.</span></span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0" style={{color:'#C2410C'}}/>
      </Link>
      <SearchBar onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
      <SearchSuggestions visible={showSuggestions} />
      <CategoryChips categories={categories} active={category} onChange={setCategory} />
      {category === 'All' && <PromotedRow restaurants={promoted} />}
      <RestaurantList restaurants={restaurants} isLoading={isLoading} error={error} />
      <OrderTray />
    </div>
  );
}
