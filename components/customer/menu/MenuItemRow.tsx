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
  const nowParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const weekdayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const currentDay = weekdayIndex[nowParts.find((part) => part.type === 'weekday')?.value ?? ''];
  const currentMinutes = Number(nowParts.find((part) => part.type === 'hour')?.value ?? 0) * 60 + Number(nowParts.find((part) => part.type === 'minute')?.value ?? 0);
  const schedule = Array.isArray((item as any).availability_schedule) ? (item as any).availability_schedule : [];
  const withinSchedule = !(item as any).availability_schedule_enabled || schedule.some((window: any) => {
    if (Number(window?.day) !== currentDay || typeof window?.start !== 'string' || typeof window?.end !== 'string') return false;
    const start = /^(\d{2}):(\d{2})$/.exec(window.start);
    const end = /^(\d{2}):(\d{2})$/.exec(window.end);
    if (!start || !end) return false;
    const startMinutes = Number(start[1]) * 60 + Number(start[2]);
    const endMinutes = Number(end[1]) * 60 + Number(end[2]);
    return startMinutes < endMinutes && currentMinutes >= startMinutes && currentMinutes < endMinutes;
  });
  const nextAvailabilityLabel = (() => {
    if (!(item as any).availability_schedule_enabled || !schedule.length) return 'Not available right now';
    const windows = schedule.flatMap((window: any) => {
      if (!Number.isInteger(Number(window?.day)) || Number(window.day) < 0 || Number(window.day) > 6 || typeof window?.start !== 'string' || typeof window?.end !== 'string') return [];
      const start = /^(\d{2}):(\d{2})$/.exec(window.start);
      const end = /^(\d{2}):(\d{2})$/.exec(window.end);
      if (!start || !end) return [];
      const startMinutes = Number(start[1]) * 60 + Number(start[2]);
      const endMinutes = Number(end[1]) * 60 + Number(end[2]);
      return startMinutes < endMinutes ? [{ day: Number(window.day), startMinutes }] : [];
    });
    const upcoming = windows
      .map((window: any) => ({ ...window, daysAway: (window.day - currentDay + 7) % 7 }))
      .map((window: any) => ({ ...window, minutesAway: window.daysAway * 1440 + window.startMinutes - currentMinutes }))
      .filter((window: any) => window.minutesAway > 0)
      .sort((a: any, b: any) => a.minutesAway - b.minutesAway)[0];
    if (!upcoming) return 'No upcoming hours set';
    if (upcoming.daysAway === 0) {
      const hours = Math.floor(upcoming.minutesAway / 60);
      const minutes = upcoming.minutesAway % 60;
      if (hours === 0) return `Available in ${minutes} min`;
      if (minutes === 0) return `Available in ${hours} hr`;
      return `Available in ${hours} hr ${minutes} min`;
    }
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][(currentDay + upcoming.daysAway) % 7];
    const hour = Math.floor(upcoming.startMinutes / 60);
    const minute = upcoming.startMinutes % 60;
    const time = new Date(2000, 0, 1, hour, minute).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `Back ${dayName} at ${time}`;
  })();
  const canOrder = item.is_available !== false && restaurant.is_accepting_orders !== false && withinSchedule;
  const hasOptions = (item.option_groups ?? []).length > 0;
  const openDetails = () => { if (canOrder) router.push(`/order/restaurant/${restaurant.id}/item/${item.id}`); };

  return (
    <article
      role={canOrder ? 'link' : undefined}
      tabIndex={canOrder ? 0 : undefined}
      onClick={openDetails}
      onKeyDown={(event) => { if (canOrder && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openDetails(); } }}
      className={`min-w-0 overflow-hidden rounded-2xl transition-shadow ${canOrder ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed'}`}
      style={{border: `1px solid ${canOrder ? 'var(--line)' : '#F2C6A5'}`, background: canOrder ? '#FFFFFF' : '#FFF7ED'}}
      aria-label={canOrder ? `View ${item.name} details` : `${item.name} unavailable`}
    >
      <div
        className="relative block aspect-square w-full overflow-hidden"
        style={imageUrls[0] ? {backgroundImage: `url(${imageUrls[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'var(--peach)'} : {background: 'var(--peach)'}}
        aria-hidden="true"
      >
        {!imageUrls.length && <span className="absolute inset-0 flex items-center justify-center" style={{color:'var(--gray)'}}><ImageIcon className="h-8 w-8 opacity-50" /></span>}
        {imageUrls.length > 1 && <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-1 text-[10px] font-semibold text-white">{imageUrls.length} photos</span>}
        {!canOrder && <span className={`absolute left-2 top-2 rounded-full border px-2.5 py-1 text-[10px] font-bold shadow-sm ${item.is_available === false ? 'border-rose-200 bg-rose-100 text-rose-800' : !withinSchedule ? 'border-amber-200 bg-amber-100 text-amber-900' : 'border-violet-200 bg-violet-100 text-violet-800'}`}>{item.is_available === false ? 'Unavailable' : !withinSchedule ? 'Opens soon' : 'Orders paused'}</span>}
      </div>
      <div className="p-2.5 sm:p-3">
        <h2 className="line-clamp-2 text-sm font-semibold" style={{color:'var(--ink)'}}>{item.name}</h2>
        <p className="mt-1 text-xs font-medium" style={{color:'var(--orange)'}}>₦{item.price.toLocaleString()}</p>
        {!canOrder && <p className={`mt-1 inline-flex max-w-full rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${item.is_available === false ? 'border-rose-200 bg-rose-50 text-rose-800' : !withinSchedule ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-violet-200 bg-violet-50 text-violet-800'}`}>{item.is_available === false ? 'Currently unavailable' : !withinSchedule ? nextAvailabilityLabel : 'Restaurant not accepting orders'}</p>}
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
