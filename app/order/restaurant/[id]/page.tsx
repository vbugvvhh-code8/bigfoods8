'use client';

import {useMemo, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {ArrowLeft} from 'lucide-react';
import {useRestaurant} from '@/hooks/useRestaurants';
import {useMenuItems} from '@/hooks/useMenuItems';
import {MenuCategoryTabs} from '@/components/customer/menu/MenuCategoryTabs';
import {MenuItemRow} from '@/components/customer/menu/MenuItemRow';
import {OrderTray} from '@/components/customer/menu/OrderTray';
import {EmptyState} from '@/components/customer/shared/EmptyState';
import {ErrorState} from '@/components/customer/shared/ErrorState';
import {UtensilsCrossed} from 'lucide-react';

export default function RestaurantMenuPage() {
  const {id} = useParams<{id: string}>();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');

  const {restaurant, isLoading: restaurantLoading, error: restaurantError} = useRestaurant(id);
  const {menuItems, isLoading: menuLoading, error: menuError} = useMenuItems(id);

  const categories = useMemo(
    () => Array.from(new Set(menuItems.map((m) => m.category).filter((c): c is string => !!c))).sort(),
    [menuItems]
  );

  const visibleItems =
    activeCategory === 'All' ? menuItems : menuItems.filter((m) => m.category === activeCategory);

  const isLoading = restaurantLoading || menuLoading;

  return (
    <div className="w-full max-w-[380px] lg:max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => router.push('/order')} className="flex items-center gap-2.5 mb-4" style={{color: 'var(--gray)'}}>
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[12.5px]">Back to restaurants</span>
      </button>

      {isLoading && (
        <div className="space-y-3" aria-busy="true">
          <div className="h-[110px] rounded-xl animate-pulse" style={{background: 'var(--peach)'}} />
          <div className="h-4 w-2/3 rounded animate-pulse" style={{background: 'var(--peach)'}} />
          <div className="h-3 w-1/2 rounded animate-pulse" style={{background: 'var(--peach)'}} />
        </div>
      )}

      {!isLoading && (restaurantError || !restaurant) && <ErrorState message="Couldn't load this restaurant." />}

      {!isLoading && restaurant && (
        <>
          <div
            className="h-[110px] rounded-xl mb-3 bg-cover bg-center"
            style={
              restaurant.image_url
                ? {backgroundImage: `url(${restaurant.image_url})`}
                : {background: 'linear-gradient(135deg, #FFD9B3, var(--peach))'}
            }
          />

          <div className="mb-4">
            <h1 className="font-display text-[19px] font-semibold" style={{color: 'var(--ink)'}}>
              {restaurant.name}
            </h1>
            <div className="text-[11.5px]" style={{color: 'var(--gray)'}}>
              {restaurant.rating != null && `${restaurant.rating} ★ · `}
              {restaurant.category}
              {restaurant.etaMinutes != null && ` · ~${restaurant.etaMinutes} min`}
              {restaurant.zone && ` · ${restaurant.zone}`}
              {!restaurant.isOpenNow && <span className="font-semibold" style={{color: 'var(--red, #C1453A)'}}> · Closed</span>}
            </div>
          </div>

          <MenuCategoryTabs categories={categories} active={activeCategory} onChange={setActiveCategory} />

          {menuError && <ErrorState message="Couldn't load the menu." />}

          {!menuError && visibleItems.length === 0 && (
            <EmptyState
              icon={<UtensilsCrossed className="w-5 h-5" />}
              title="Nothing here yet"
              message="This restaurant hasn't added items to this category."
            />
          )}

          {!menuError && visibleItems.length > 0 && (
            <div className="divide-y" style={{borderColor: 'var(--line)'}}>
              {visibleItems.map((item) => (
                <MenuItemRow key={item.id} item={item} restaurant={restaurant} />
              ))}
            </div>
          )}
        </>
      )}

      <OrderTray />
    </div>
  );
}
