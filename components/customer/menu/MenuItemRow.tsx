'use client';

import {useRouter} from 'next/navigation';
import {Plus, Minus, Image as ImageIcon} from 'lucide-react';
import {useCart} from '@/hooks/useCart';
import type {MenuItem, Restaurant} from '@/types/database';

interface MenuItemRowProps {
  item: MenuItem;
  restaurant: Restaurant;
}

export function MenuItemRow({item, restaurant}: MenuItemRowProps) {
  const router = useRouter();
  const {items, addItem, updateQuantity} = useCart();
  const imageUrls = Array.isArray((item as any).image_urls) && (item as any).image_urls.length > 0
    ? (item as any).image_urls as string[]
    : item.image_url ? [item.image_url] : [];
  const cartItem = items.find((i) => i.id === item.id);
  const quantity = cartItem?.quantity ?? 0;
  const canOrder = item.is_available !== false && restaurant.is_accepting_orders !== false;
  const hasOptions = (item.option_groups ?? []).length > 0;
  const openDetails = () => { if (canOrder) router.push(`/order/restaurant/${restaurant.id}/item/${item.id}`); };

  return (
    <article
      role={canOrder ? 'link' : undefined}
      tabIndex={canOrder ? 0 : undefined}
      onClick={openDetails}
      onKeyDown={(event) => { if (canOrder && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openDetails(); } }}
      className={`min-w-0 overflow-hidden rounded-2xl bg-white ${canOrder ? 'cursor-pointer' : 'cursor-not-allowed opacity-40 grayscale'}`}
      style={{border: '1px solid var(--line)'}}
      aria-label={canOrder ? `View ${item.name} details` : `${item.name} unavailable`}
    >
      <div
        className="relative block aspect-square w-full overflow-hidden"
        style={imageUrls[0] ? {backgroundImage: `url(${imageUrls[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'var(--peach)'} : {background: 'var(--peach)'}}
        aria-hidden="true"
      >
        {!imageUrls.length && <span className="absolute inset-0 flex items-center justify-center" style={{color:'var(--gray)'}}><ImageIcon className="h-8 w-8 opacity-50" /></span>}
        {imageUrls.length > 1 && <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-1 text-[10px] font-semibold text-white">{imageUrls.length} photos</span>}
        {!canOrder && <span className="absolute inset-0 flex items-center justify-center bg-white/25 text-center text-xs font-bold text-gray-800">Unavailable</span>}
      </div>
      <div className="p-2.5 sm:p-3">
        <h2 className="line-clamp-2 text-sm font-semibold" style={{color:'var(--ink)'}}>{item.name}</h2>
        <p className="mt-1 text-xs font-medium" style={{color:'var(--orange)'}}>₦{item.price.toLocaleString()}</p>
        {!canOrder && <p className="mt-1 text-[11px] font-semibold" style={{color:'var(--red, #C1453A)'}}>{item.is_available === false ? 'Currently unavailable' : 'Restaurant not accepting orders'}</p>}
        {canOrder && <div className="mt-3">
          {hasOptions ? (
            <button type="button" onClick={(event) => { event.stopPropagation(); openDetails(); }} className="min-h-10 w-full rounded-full px-2 py-2 text-[11px] font-semibold text-white sm:text-xs" style={{background:'var(--orange)'}}>Choose options</button>
          ) : quantity === 0 ? (
            <button type="button" onClick={(event) => { event.stopPropagation(); addItem({id:item.id,name:item.name,price:item.price,restaurantId:restaurant.id,restaurantName:restaurant.name}); }} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full text-xs font-semibold text-white" style={{background:'var(--orange)'}}><Plus className="h-4 w-4" /> Add</button>
          ) : (
            <div className="flex min-h-10 items-center justify-between rounded-full border px-2" style={{borderColor:'var(--orange)'}}>
              <button type="button" onClick={(event) => { event.stopPropagation(); updateQuantity(item.id, quantity - 1); }} className="flex h-8 w-8 items-center justify-center" style={{color:'var(--orange)'}} aria-label={`Remove one ${item.name}`}><Minus className="h-4 w-4" /></button>
              <span className="text-sm font-semibold" style={{color:'var(--ink)'}}>{quantity}</span>
              <button type="button" onClick={(event) => { event.stopPropagation(); updateQuantity(item.id, quantity + 1); }} className="flex h-8 w-8 items-center justify-center" style={{color:'var(--orange)'}} aria-label={`Add one more ${item.name}`}><Plus className="h-4 w-4" /></button>
            </div>
          )}
        </div>}
      </div>
    </article>
  );
}
