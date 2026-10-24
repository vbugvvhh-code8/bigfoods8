'use client';

import {useRouter} from 'next/navigation';
import {Plus, Minus, Image as ImageIcon, ChevronLeft, ChevronRight, X} from 'lucide-react';
import {useCart} from '@/hooks/useCart';
import type {MenuItem, Restaurant} from '@/types/database';

interface MenuItemRowProps {
  item: MenuItem;
  restaurant: Restaurant;
  relatedItems?: MenuItem[];
}

export function MenuItemRow({item, restaurant, relatedItems = []}: MenuItemRowProps) {
  const router = useRouter();
  const {items, addItem, updateQuantity} = useCart();
  const imageUrls = Array.isArray((item as any).image_urls) && (item as any).image_urls.length > 0
    ? (item as any).image_urls as string[]
    : item.image_url ? [item.image_url] : [];
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
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
  const now = Date.now();
  const promotionInWindow = item.promotional_price != null && (!item.promotion_starts_at || new Date(item.promotion_starts_at).getTime() <= now) && (!item.promotion_ends_at || new Date(item.promotion_ends_at).getTime() > now);
  const displayPrice = promotionInWindow ? Number(item.promotional_price) : Number(item.price);
  const related = (item.complementary_item_ids ?? []).map(id => relatedItems.find(candidate => candidate.id === id)).filter((candidate): candidate is MenuItem => !!candidate && candidate.is_available !== false && !(candidate as any).admin_disabled).slice(0, 3);
  const adminDisabled = Boolean((item as any).admin_disabled);
  const canOrder = !adminDisabled && item.is_available !== false && restaurant.is_accepting_orders !== false && withinSchedule;
  const hasOptions = (item.option_groups ?? []).length > 0;
  const openDetails = () => { if (canOrder) router.push(`/order/restaurant/${restaurant.id}/item/${item.id}`); };

  return (
    <article
      role={canOrder ? 'link' : undefined}
      tabIndex={canOrder ? 0 : undefined}
      onClick={openDetails}
      onKeyDown={(event) => { if (canOrder && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openDetails(); } }}
      className={`min-w-0 overflow-hidden rounded-2xl transition-all duration-200 ${canOrder ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg' : 'cursor-not-allowed'}`}
      style={{border: `1px solid ${canOrder ? '#F4D7BC' : '#F2C6A5'}`, background: canOrder ? 'linear-gradient(160deg, #FFFFFF 0%, #FFFAF4 100%)' : 'linear-gradient(160deg, #FFF7ED 0%, #FFF0E0 100%)', boxShadow: canOrder ? '0 2px 10px rgba(124, 65, 22, 0.045)' : '0 2px 8px rgba(180, 83, 9, 0.06)'}}
      aria-label={canOrder ? `View ${item.name} details` : `${item.name} unavailable`}
    >
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); if (imageUrls.length > 0) { setActiveImageIndex(0); setGalleryOpen(true); } }}
        onKeyDown={(event) => event.stopPropagation()}
        className="relative block aspect-square w-full overflow-hidden text-left"
        style={imageUrls[0] ? {backgroundImage: `url(${imageUrls[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#FFE8D2'} : {background: 'linear-gradient(135deg, #FFE8D2, #FFF2E5)'}}
        aria-label={imageUrls.length > 1 ? `View ${imageUrls.length} photos of ${item.name}` : `View photo of ${item.name}`}
        disabled={!imageUrls.length}
      >
        {!imageUrls.length && <span className="absolute inset-0 flex items-center justify-center" style={{color:'#D97732'}}><ImageIcon className="h-8 w-8 opacity-50" /></span>}
        {imageUrls.length > 1 && <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-1 text-[10px] font-semibold text-white">{imageUrls.length} photos · View gallery</span>}
        {!canOrder && <span className={`absolute left-2 top-2 rounded-full border px-2.5 py-1 text-[10px] font-bold shadow-sm ${item.is_available === false ? 'border-rose-200 bg-rose-100 text-rose-800' : !withinSchedule ? 'border-amber-200 bg-amber-100 text-amber-900' : 'border-violet-200 bg-violet-100 text-violet-800'}`}>{item.is_available === false ? 'Unavailable' : !withinSchedule ? 'Opens soon' : 'Orders paused'}</span>}
      </button>
      <div className="p-2.5 sm:p-3">
        <h2 className="line-clamp-2 text-sm font-semibold" style={{color:'var(--ink)'}}>{item.name}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold" style={{color:'var(--orange)'}}>{promotionInWindow ? <><span>₦{displayPrice.toLocaleString()}</span><span className="text-[10px] font-medium line-through" style={{color:'var(--gray)'}}>₦{Number(item.price).toLocaleString()}</span><span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{background:'#FCE8E6',color:'#B42318'}}>SALE</span></> : <span>₦{Number(item.price).toLocaleString()}</span>}</div>
        {(item.dietary_tags ?? []).length > 0 && <div className="mt-2 flex flex-wrap gap-1">{item.dietary_tags.slice(0,3).map(tag=><span key={tag} className="rounded-full px-2 py-1 text-[9px] font-semibold" style={{background:/spicy|hot/i.test(tag)?'#FCE8E6':'#E7F6EC',color:/spicy|hot/i.test(tag)?'#B42318':'#207245'}}>{tag}</span>)}</div>}
        {!canOrder && <p className={`mt-1 inline-flex max-w-full rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${item.is_available === false ? 'border-rose-200 bg-rose-50 text-rose-800' : !withinSchedule ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-violet-200 bg-violet-50 text-violet-800'}`}>{item.is_available === false ? 'Currently unavailable' : !withinSchedule ? nextAvailabilityLabel : 'Restaurant not accepting orders'}</p>}
        {canOrder && <div className="mt-3">
          {hasOptions ? (
            <button type="button" onClick={(event) => { event.stopPropagation(); openDetails(); }} className="min-h-10 w-full rounded-full px-2 py-2 text-[11px] font-semibold text-white sm:text-xs" style={{background:'var(--orange)'}}>Choose options</button>
          ) : quantity === 0 ? (
            <button type="button" onClick={(event) => { event.stopPropagation(); addItem({id:item.id,name:item.name,price:displayPrice,restaurantId:restaurant.id,restaurantName:restaurant.name}); }} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full text-xs font-semibold text-white" style={{background:'var(--orange)'}}><Plus className="h-4 w-4" /> Add</button>
          ) : (
            <div className="flex min-h-10 items-center justify-between rounded-full border px-2" style={{borderColor:'var(--orange)'}}>
              <button type="button" onClick={(event) => { event.stopPropagation(); updateQuantity(item.id, quantity - 1); }} className="flex h-8 w-8 items-center justify-center" style={{color:'var(--orange)'}} aria-label={`Remove one ${item.name}`}><Minus className="h-4 w-4" /></button>
              <span className="text-sm font-semibold" style={{color:'var(--ink)'}}>{quantity}</span>
              <button type="button" onClick={(event) => { event.stopPropagation(); updateQuantity(item.id, quantity + 1); }} className="flex h-8 w-8 items-center justify-center" style={{color:'var(--orange)'}} aria-label={`Add one more ${item.name}`}><Plus className="h-4 w-4" /></button>
            </div>
          )}
        </div>}
        {related.length > 0 && <div className="mt-3 border-t pt-2" style={{borderColor:'var(--line)'}}><p className="mb-1.5 text-[10px] font-bold" style={{color:'var(--gray)'}}>Goes well with</p><div className="flex flex-wrap gap-1">{related.map(candidate=><button key={candidate.id} type="button" onClick={event=>{event.stopPropagation();router.push(`/order/restaurant/${restaurant.id}/item/${candidate.id}`);}} className="rounded-full border px-2 py-1 text-[10px] font-semibold" style={{borderColor:'var(--line)',color:'var(--orange)'}}>{candidate.name}</button>)}</div></div>}
      </div>
      {galleryOpen && imageUrls.length > 0 && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
          role="presentation"
          onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) setGalleryOpen(false); }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <section role="dialog" aria-modal="true" aria-label={`${item.name} photo gallery`} className="relative w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><h2 className="text-sm font-bold text-gray-900">{item.name}</h2><p className="text-xs text-gray-500">Photo {activeImageIndex + 1} of {imageUrls.length}</p></div>
              <button type="button" onClick={() => setGalleryOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100" aria-label="Close photo gallery"><X className="h-5 w-5" /></button>
            </div>
            <div className="aspect-square w-full rounded-xl bg-cover bg-center bg-no-repeat" style={{backgroundImage: `url(${imageUrls[activeImageIndex]}), linear-gradient(135deg, #FFE3C7, #FFD9B3)`}} role="img" aria-label={`${item.name}, photo ${activeImageIndex + 1}`} />
            {imageUrls.length > 1 && <div className="mt-3 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setActiveImageIndex((index) => (index - 1 + imageUrls.length) % imageUrls.length)} className="flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm font-semibold text-gray-800" aria-label="Previous photo"><ChevronLeft className="h-4 w-4" /> Previous</button>
              <div className="flex gap-1.5">{imageUrls.map((url, index) => <button key={url + index} type="button" onClick={() => setActiveImageIndex(index)} className="h-2.5 w-2.5 rounded-full" style={{background: index === activeImageIndex ? 'var(--orange)' : '#D1D5DB'}} aria-label={`Show photo ${index + 1}`} aria-current={index === activeImageIndex ? 'true' : undefined} />)}</div>
              <button type="button" onClick={() => setActiveImageIndex((index) => (index + 1) % imageUrls.length)} className="flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm font-semibold text-gray-800" aria-label="Next photo">Next <ChevronRight className="h-4 w-4" /></button>
            </div>}
          </section>
        </div>
      )}
    </article>
  );
}
