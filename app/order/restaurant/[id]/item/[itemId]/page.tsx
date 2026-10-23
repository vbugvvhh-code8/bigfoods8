'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock3, Minus, Plus, UtensilsCrossed } from 'lucide-react';
import { useRestaurant } from '@/hooks/useRestaurants';
import { useMenuItems } from '@/hooks/useMenuItems';
import { useCart } from '@/hooks/useCart';
import { OrderTray } from '@/components/customer/menu/OrderTray';
import { ErrorState } from '@/components/customer/shared/ErrorState';

export default function MenuItemDetailsPage() {
  const { id, itemId } = useParams<{ id: string; itemId: string }>();
  const { restaurant, isLoading: restaurantLoading, error: restaurantError } = useRestaurant(id);
  const { menuItems, isLoading: menuLoading, error: menuError } = useMenuItems(id);
  const { items, addItem, updateQuantity } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({});

  const item = useMemo(() => menuItems.find((candidate) => candidate.id === itemId), [menuItems, itemId]);
  const images = useMemo(() => {
    if (!item) return [];
    const stored = Array.isArray(item.image_urls) ? item.image_urls.filter(Boolean) : [];
    return stored.length ? stored : item.image_url ? [item.image_url] : [];
  }, [item]);
  const selectedOptions = useMemo(() => (item?.option_groups ?? []).flatMap((group) =>
    group.options.filter((option) => (selectedByGroup[group.id] ?? []).includes(option.id)).map((option) => ({
      groupId: group.id, groupName: group.name, optionId: option.id, optionName: option.name, price: option.price,
    }))
  ), [item, selectedByGroup]);
  const cartKey = item ? `${item.id}::${selectedOptions.map((option) => `${option.groupId}:${option.optionId}`).sort().join('|')}` : '';
  const cartItem = items.find((candidate) => candidate.id === cartKey);
  const quantity = cartItem?.quantity ?? 0;
  const isLoading = restaurantLoading || menuLoading;
  const canOrder = !!item && !!restaurant && item.is_available !== false && restaurant.is_accepting_orders !== false;
  const optionsValid = (item?.option_groups ?? []).every((group) => {
    const count = (selectedByGroup[group.id] ?? []).length;
    const min = group.required ? Math.max(1, group.min_select ?? 1) : (group.min_select ?? 0);
    const max = group.selection_type === 'single' ? 1 : (group.max_select ?? group.options.length);
    return count >= min && count <= max;
  });
  const unitPrice = item ? Number(item.price) + selectedOptions.reduce((sum, option) => sum + option.price, 0) : 0;
  const updateOptionSelection = (groupId: string, optionId: string, selectionType: 'single' | 'multiple') => {
    setSelectedByGroup((prev) => {
      const current = prev[groupId] ?? [];
      const next = selectionType === 'single'
        ? [optionId]
        : current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
      return { ...prev, [groupId]: next };
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-28">
      <Link href={`/order/restaurant/${id}`} className="mb-4 inline-flex items-center gap-2 text-sm" style={{ color: 'var(--gray)' }}>
        <ArrowLeft className="h-4 w-4" /> Back to menu
      </Link>

      {isLoading && <div className="h-72 animate-pulse rounded-2xl" style={{ background: 'var(--peach)' }} aria-label="Loading dish details" />}
      {!isLoading && (restaurantError || menuError || !restaurant) && <ErrorState message="Couldn't load this dish. Please return to the restaurant menu and try again." />}
      {!isLoading && restaurant && !menuError && !item && <ErrorState message="This dish could not be found in this restaurant's menu." />}

      {!isLoading && restaurant && item && (
        <article>
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--line)', background: 'var(--white)' }}>
            {images.length > 0 ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[Math.min(activeImage, images.length - 1)]} alt={item.name} className="aspect-[4/3] w-full object-cover" />
                {images.length > 1 && <div className="flex gap-2 overflow-x-auto p-3">
                  {images.map((url, index) => (
                    <button key={url} type="button" onClick={() => setActiveImage(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={activeImage === index} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2" style={{ borderColor: activeImage === index ? 'var(--orange)' : 'var(--line)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>}
              </div>
            ) : <div className="flex aspect-[4/3] items-center justify-center" style={{ background: 'var(--peach)' }}><UtensilsCrossed className="h-12 w-12" style={{ color: 'var(--gray)' }} /></div>}

            <div className="p-5">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mb-1 text-xs" style={{ color: 'var(--gray)' }}>
                    <Link href={`/order/restaurant/${id}`} className="underline underline-offset-2">{restaurant.name}</Link>
                    {item.category ? ` · ${item.category}` : ''}{item.subcategory ? ` · ${item.subcategory}` : ''}
                  </p>
                  <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--ink)' }}>{item.name}</h1>
                </div>
                <p className="shrink-0 text-xl font-bold" style={{ color: 'var(--orange)' }}>₦{Number(item.price).toLocaleString()}</p>
              </div>

              {item.is_available === false ? <p className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#FCE8E6', color: '#B42318' }}>Currently unavailable</p> : !restaurant.is_accepting_orders && <p className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#FCE8E6', color: '#B42318' }}>Restaurant not accepting orders</p>}

              {item.description && <p className="mt-3 whitespace-pre-line text-sm leading-6" style={{ color: 'var(--ink)' }}>{item.description}</p>}

              <div className="mt-5 flex flex-wrap gap-2">
                {item.preparation_time_minutes && <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs" style={{ background: 'var(--peach)', color: 'var(--ink)' }}><Clock3 className="h-3.5 w-3.5" /> About {item.preparation_time_minutes} min</span>}
                {item.serving_size && <span className="rounded-full px-3 py-1.5 text-xs" style={{ background: 'var(--peach)', color: 'var(--ink)' }}>Serving: {item.serving_size}</span>}
                {(item.dietary_tags ?? []).map((tag) => <span key={tag} className="rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: '#E7F6EC', color: '#207245' }}>{tag}</span>)}
              </div>

              {item.ingredients && <section className="mt-6 border-t pt-5" style={{ borderColor: 'var(--line)' }}><h2 className="mb-2 text-sm font-bold" style={{ color: 'var(--ink)' }}>Ingredients</h2><p className="whitespace-pre-line text-sm leading-6" style={{ color: 'var(--gray)' }}>{item.ingredients}</p></section>}

              {(item.option_groups ?? []).map((group) => (
                <section key={group.id} className="mt-5 border-t pt-5" style={{ borderColor: 'var(--line)' }}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div><h2 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{group.name}</h2><p className="mt-1 text-[11px]" style={{ color: 'var(--gray)' }}>{group.selection_type === 'single' ? 'Choose one' : `Choose up to ${group.max_select ?? group.options.length}`}{group.required ? ' · Required' : ' · Optional'}</p></div>
                    {group.required && <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: 'var(--peach)', color: 'var(--ink)' }}>Required</span>}
                  </div>
                  <div className="space-y-2">
                    {group.options.filter((option) => option.is_available !== false).map((option) => {
                      const checked = (selectedByGroup[group.id] ?? []).includes(option.id);
                      return <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3" style={{ borderColor: checked ? 'var(--orange)' : 'var(--line)', background: checked ? '#FFF7F0' : 'var(--white)' }}>
                        <input type={group.selection_type === 'single' ? 'radio' : 'checkbox'} name={`option-group-${group.id}`} checked={checked} onChange={() => updateOptionSelection(group.id, option.id, group.selection_type)} className="h-4 w-4 accent-orange-600" />
                        <span className="min-w-0 flex-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>{option.name}</span>
                        <span className="text-xs font-semibold" style={{ color: option.price > 0 ? 'var(--orange)' : 'var(--gray)' }}>{option.price > 0 ? `+₦${option.price.toLocaleString()}` : 'Included'}</span>
                      </label>;
                    })}
                  </div>
                  {group.selection_type === 'multiple' && group.min_select != null && group.min_select > 0 && <p className="mt-2 text-[10px]" style={{ color: 'var(--gray)' }}>Select at least {group.min_select}.</p>}
                </section>
              ))}
              {(item.allergens ?? []).length > 0 && <section className="mt-5 rounded-xl border p-4" style={{ borderColor: '#F3C78B', background: '#FFF8EC' }}><h2 className="mb-1 text-sm font-bold" style={{ color: '#8A4B08' }}>Allergen information</h2><p className="text-sm" style={{ color: '#8A4B08' }}>Contains or may contain: {item.allergens.join(', ')}. Please contact the restaurant if you have an allergy or need ingredient confirmation.</p></section>}

              <div className="mt-6 border-t pt-5" style={{ borderColor: 'var(--line)' }}>
                {quantity > 0 ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>In your cart</span>
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={() => updateQuantity(cartKey, quantity - 1)} className="flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }} aria-label="Remove one"><Minus className="h-4 w-4" /></button>
                      <span className="min-w-4 text-center font-bold">{quantity}</span>
                      <button type="button" disabled={!canOrder} onClick={() => canOrder && updateQuantity(cartKey, quantity + 1)} className="flex h-10 w-10 items-center justify-center rounded-full text-white disabled:opacity-40" style={{ background: 'var(--orange)' }} aria-label="Add one more"><Plus className="h-4 w-4" /></button>
                    </div>
                  </div>
                ) : <button type="button" disabled={!canOrder || !optionsValid} onClick={() => canOrder && optionsValid && addItem({ id: cartKey, menuItemId: item.id, name: item.name, price: unitPrice, selectedOptions, restaurantId: restaurant.id, restaurantName: restaurant.name })} className="w-full rounded-xl px-5 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40" style={{ background: 'var(--orange)' }}>{!canOrder ? 'Not available to order' : !optionsValid ? 'Choose required options' : `Add to cart · ₦${unitPrice.toLocaleString()}`}</button>}
              </div>
            </div>
          </div>
        </article>
      )}
      <OrderTray />
    </div>
  );
}
