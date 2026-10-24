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
import {useTrackRestaurantPageView} from '@/hooks/useTrackRestaurantEvent';

export default function RestaurantMenuPage() {
  const {id} = useParams<{id: string}>();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');

  const {restaurant, isLoading: restaurantLoading, error: restaurantError} = useRestaurant(id);
  useTrackRestaurantPageView(restaurant?.id);
  const {menuItems, isLoading: menuLoading, error: menuError} = useMenuItems(id);

  // Keep unavailable dishes visible so customers can see their status; MenuItemRow blocks adding them to the cart.
  const categories = useMemo(
    () => Array.from(new Set(menuItems.map((m) => m.category).filter((c): c is string => !!c))).sort(),
    [menuItems]
  );

  const visibleItems =
    activeCategory === 'All' ? menuItems : menuItems.filter((m) => m.category === activeCategory);

  const isLoading = restaurantLoading || menuLoading;

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-5xl overflow-hidden px-4 py-6" style={{background: "radial-gradient(ellipse at top left, rgba(255, 220, 185, 0.32), transparent 42%), linear-gradient(180deg, #FFFCF8 0%, #FFF8F0 100%)"}}>
      <button type="button" onClick={() => router.push('/order')} className="mb-4 inline-flex items-center gap-2.5 rounded-full border px-3 py-2 transition-colors hover:bg-orange-50" style={{color: '#A65A28', borderColor: '#F4D7BC', background: 'rgba(255,255,255,0.8)'}}>
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
                ? {backgroundImage: `url(${restaurant.image_url}), linear-gradient(135deg, #FFE3C7, #FFD9B3)`}
                : {background: 'linear-gradient(135deg, #FFD9B3, var(--peach))'}
            }
          />

          <div className="mb-4">
            <h1 className="font-display text-[19px] font-semibold" style={{color: 'var(--ink)'}}>
              {restaurant.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px]" style={{color: '#865F47'}}>
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
              message="This restaurant hasn't added items to this category yet."
            />
          )}

          {!menuError && visibleItems.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {visibleItems.map((item) => (
                <MenuItemRow key={item.id} item={item} restaurant={restaurant} relatedItems={menuItems} />
              ))}
            </div>
          )}
        </>
      )}

      <OrderTray />
    </div>
  );
}
