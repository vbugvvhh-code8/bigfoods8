'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Plus, Minus, ChevronLeft, ChevronRight, X, Image as ImageIcon} from 'lucide-react';
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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const cartItem = items.find((i) => i.id === item.id);
  const quantity = cartItem?.quantity ?? 0;
  const canOrder = item.is_available !== false && restaurant.is_accepting_orders !== false;
  const hasOptions = (item.option_groups ?? []).length > 0;

  return (
    <article className={`min-w-0 overflow-hidden rounded-2xl bg-white ${!canOrder ? 'opacity-40 grayscale' : ''}`} style={{border: '1px solid var(--line)'}}>
      <button
        type="button"
        onClick={() => canOrder && (hasOptions ? router.push(`/order/restaurant/${restaurant.id}/item/${item.id}`) : imageUrls.length > 0 && setGalleryOpen(true))}
        disabled={!canOrder || imageUrls.length === 0 && !hasOptions}
        className="relative block aspect-square w-full overflow-hidden disabled:cursor-not-allowed"
        style={imageUrls[0] ? {backgroundImage: `url(${imageUrls[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'var(--peach)'} : {background: 'var(--peach)'}}
        aria-label={canOrder ? `View ${item.name}` : `${item.name}, currently unavailable`}
      >
        {!imageUrls.length && <span className="absolute inset-0 flex items-center justify-center" style={{color:'var(--gray)'}}><ImageIcon className="h-8 w-8 opacity-50" /></span>}
        {imageUrls.length > 1 && <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-1 text-[10px] font-semibold text-white">{imageUrls.length} photos</span>}
        {!canOrder && <span className="absolute inset-0 flex items-center justify-center bg-white/25 text-center text-xs font-bold text-gray-800">Unavailable</span>}
      </button>
      <div className="p-2.5 sm:p-3">
        <h2 className="line-clamp-2 min-h-[2.5em] text-sm font-semibold" style={{color:'var(--ink)'}}>{item.name}</h2>
        <p className="mt-1 text-sm font-semibold" style={{color:'var(--ink)'}}>₦{item.price.toLocaleString()}</p>
        {!canOrder && <p className="mt-1 text-[11px] font-semibold" style={{color:'var(--red, #C1453A)'}}>{item.is_available === false ? 'Currently unavailable' : 'Restaurant not accepting orders'}</p>}
        {canOrder && <div className="mt-3">
          {hasOptions ? (
            <button type="button" onClick={() => router.push(`/order/restaurant/${restaurant.id}/item/${item.id}`)} className="w-full rounded-full border px-2 py-2 text-[11px] font-semibold sm:text-xs" style={{borderColor:'var(--orange)',color:'var(--orange)'}}>Choose options</button>
          ) : quantity === 0 ? (
            <button type="button" onClick={() => addItem({id:item.id,name:item.name,price:item.price,restaurantId:restaurant.id,restaurantName:restaurant.name})} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full text-xs font-semibold text-white" style={{background:'var(--orange)'}}><Plus className="h-4 w-4" /> Add</button>
          ) : (
            <div className="flex min-h-10 items-center justify-between rounded-full border px-2" style={{borderColor:'var(--orange)'}}>
              <button type="button" onClick={() => updateQuantity(item.id, quantity - 1)} className="flex h-8 w-8 items-center justify-center" style={{color:'var(--orange)'}} aria-label={`Remove one ${item.name}`}><Minus className="h-4 w-4" /></button>
              <span className="text-sm font-semibold" style={{color:'var(--ink)'}}>{quantity}</span>
              <button type="button" onClick={() => updateQuantity(item.id, quantity + 1)} className="flex h-8 w-8 items-center justify-center" style={{color:'var(--orange)'}} aria-label={`Add one more ${item.name}`}><Plus className="h-4 w-4" /></button>
            </div>
          )}
        </div>}
      </div>
      {galleryOpen && canOrder && imageUrls.length > 0 && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4" role="presentation" onMouseDown={(event) => {if(event.target === event.currentTarget) setGalleryOpen(false);}}>
          <section role="dialog" aria-modal="true" aria-label={`${item.name} photo gallery`} className="relative w-full max-w-lg rounded-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-gray-900">{item.name}</h2><p className="text-xs text-gray-500">Photo {activeImageIndex + 1} of {imageUrls.length}</p></div><button type="button" onClick={() => setGalleryOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700" aria-label="Close photo gallery"><X className="h-5 w-5" /></button></div>
            <div className="aspect-square w-full rounded-xl bg-cover bg-center" style={{backgroundImage:`url(${imageUrls[activeImageIndex]})`}} role="img" aria-label={`${item.name}, photo ${activeImageIndex + 1}`} />
            {imageUrls.length > 1 && <div className="mt-3 flex items-center justify-between gap-3"><button type="button" onClick={() => setActiveImageIndex((index) => (index - 1 + imageUrls.length) % imageUrls.length)} className="flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm font-semibold text-gray-800"><ChevronLeft className="h-4 w-4" /> Previous</button><button type="button" onClick={() => setActiveImageIndex((index) => (index + 1) % imageUrls.length)} className="flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm font-semibold text-gray-800">Next <ChevronRight className="h-4 w-4" /></button></div>}
          </section>
        </div>
      )}
    </article>
  );
}
