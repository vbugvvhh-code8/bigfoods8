'use client';

import type {RestaurantWithMeta} from '@/lib/customer/types';
import {RestaurantCard} from '@/components/customer/shared/RestaurantCard';
import {EmptyState} from '@/components/customer/shared/EmptyState';
import {ErrorState} from '@/components/customer/shared/ErrorState';
import {CardListSkeleton} from '@/components/customer/shared/CardListSkeleton';
import {Store} from 'lucide-react';

interface RestaurantListProps {
  restaurants: RestaurantWithMeta[];
  isLoading: boolean;
  error: unknown;
  title?: string;
}

export function RestaurantList({restaurants, isLoading, error, title = 'All restaurants'}: RestaurantListProps) {
  return (
    <div className="mt-6">
      <h2 className="font-display text-[15px] font-semibold mb-1" style={{color: 'var(--ink)'}}>
        {title}
      </h2>

      {isLoading && <CardListSkeleton />}

      {!isLoading && !!error && <ErrorState message="Couldn't load restaurants." />}

      {!isLoading && !error && restaurants.length === 0 && (
        <EmptyState
          icon={<Store className="w-5 h-5" />}
          title="No restaurants here yet"
          message="Try a different category, or check back soon — new kitchens join every week."
        />
      )}

      {!isLoading && !error && restaurants.length > 0 && (
        // Lightened from the original full-strength var(--line) — color-mix
        // works regardless of --line's actual hex value, no guessing needed.
        <div className="divide-y" style={{borderColor: 'color-mix(in srgb, var(--line) 45%, transparent)'}}>
          {restaurants.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      )}
    </div>
  );
}
