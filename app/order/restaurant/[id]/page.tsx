'use client';

import {useMemo, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {CalendarDays, ArrowRight} from 'lucide-react';
import {useRestaurant} from '@/hooks/useRestaurants';
import {useMenuItems} from '@/hooks/useMenuItems';
import {MenuCategoryTabs} from '@/components/customer/menu/MenuCategoryTabs';
import {MenuItemRow} from '@/components/customer/menu/MenuItemRow';
import {OrderTray} from '@/components/customer/menu/OrderTray';
import {EmptyState} from '@/components/customer/shared/EmptyState';
import {ErrorState} from '@/components/customer/shared/ErrorState';
import {UtensilsCrossed} from 'lucide-react';
import {useTrackRestaurantPageView} from '@/hooks/useTrackRestaurantEvent';
import {useCart} from '@/hooks/useCart';

export default function RestaurantMenuPage() {
  const {id} = useParams<{id: string}>();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');
  const {count: cartCount} = useCart();

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
    <div className={`relative mx-auto w-full max-w-5xl overflow-x-clip px-4 pt-0 ${cartCount > 0 ? "pb-32" : "pb-5"}`} style={{background: "radial-gradient(ellipse at top left, rgba(255, 220, 185, 0.32), transparent 42%), linear-gradient(180deg, #FFFCF8 0%, #FFF8F0 100%)"}}>
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
          <section
            className="relative -mx-4 mb-5 h-[210px] overflow-hidden sm:h-[250px]"
            style={
              restaurant.image_url
                ? {backgroundImage: `url(${restaurant.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center'}
                : {background: 'linear-gradient(135deg, #FFD9B3, #F97316)'}
            }
            aria-label={`${restaurant.name} restaurant banner`}
          >
            <div className="absolute inset-0" style={{background:'linear-gradient(180deg, rgba(0,0,0,0.02) 15%, rgba(0,0,0,0.72) 100%)'}} />
            <div className="absolute bottom-0 left-0 right-0 flex items-end gap-3 p-4 sm:p-5">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-white bg-white shadow-lg sm:h-[72px] sm:w-[72px]">
                {restaurant.logo_url ? (
                  <img src={restaurant.logo_url} alt={`${restaurant.name} logo`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold" style={{color:'#C2410C'}}>BF</div>
                )}
              </div>
              <div className="min-w-0 pb-1 text-white">
                <h1 className="truncate font-display text-xl font-bold sm:text-2xl">{restaurant.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-white/90">
                  {restaurant.rating != null && <span>{restaurant.rating} ★</span>}
                  {restaurant.category && <><span>·</span><span>{restaurant.category}</span></>}
                  {restaurant.etaMinutes != null && <><span>·</span><span>~{restaurant.etaMinutes} min</span></>}
                  {restaurant.zone && <><span>·</span><span>{restaurant.zone}</span></>}
                  {!restaurant.isOpenNow && <span className="font-semibold text-orange-100">· Closed</span>}
                </div>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={() => router.push(`/subscriptions/new?restaurantId=${encodeURIComponent(restaurant.id)}`)}
            className="mb-5 flex w-full items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition hover:shadow-sm sm:p-4"
            style={{borderColor:'#FED7AA',background:'linear-gradient(110deg,#FFF7ED,#FFFFFF)'}}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{background:'#FFEDD5',color:'#C2410C'}}><CalendarDays className="h-5 w-5"/></span>
              <span className="min-w-0">
                <span className="block text-sm font-bold" style={{color:'#9A3412'}}>Subscribe to meals</span>
                <span className="mt-0.5 block text-xs" style={{color:'#7C5A46'}}>Choose meals from {restaurant.name} and schedule your deliveries.</span>
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0" style={{color:'#C2410C'}}/>
          </button>

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
            <div className="relative -mt-1 grid grid-cols-2 gap-3 sm:gap-4">
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
