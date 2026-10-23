'use client';

import {useState} from 'react';
import {Plus, Minus, ChevronLeft, ChevronRight, X} from 'lucide-react';
import {useCart} from '@/hooks/useCart';
import type {MenuItem, Restaurant} from '@/types/database';

interface MenuItemRowProps {
  item: MenuItem;
  restaurant: Restaurant;
}

export function MenuItemRow({item, restaurant}: MenuItemRowProps) {
  const {items, addItem, updateQuantity} = useCart();
  const imageUrls = Array.isArray((item as any).image_urls) && (item as any).image_urls.length > 0
    ? (item as any).image_urls as string[]
    : item.image_url ? [item.image_url] : [];
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const cartItem = items.find((i) => i.id === item.id);
  const quantity = cartItem?.quantity ?? 0;
  const canOrder = item.is_available !== false && restaurant.is_accepting_orders !== false;

  return (
    <div className="flex gap-3 items-center py-3">
      <button
        type="button"
        onClick={() => imageUrls.length > 0 && setGalleryOpen(true)}
        disabled={imageUrls.length === 0}
        className="relative w-[50px] h-[50px] rounded-lg flex-shrink-0 bg-cover bg-center disabled:cursor-default"
        style={imageUrls[0] ? {backgroundImage: `url(${imageUrls[0]}), linear-gradient(135deg, #FFE3C7, #FFD9B3)`} : {background: 'var(--peach)'}}
        aria-label={imageUrls.length > 1 ? `View ${imageUrls.length} photos of ${item.name}` : `View photo of ${item.name}`}
      >
        {imageUrls.length > 1 && <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] font-semibold text-white">1/{imageUrls.length}</span>}
      </button>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[12.5px]" style={{color: 'var(--ink)'}}>
          {item.name}
        </div>
        <div className="text-[11.5px]" style={{color: 'var(--gray)'}}>
          ₦{item.price.toLocaleString()}
        </div>
        {!canOrder && <div className="mt-0.5 text-[10px] font-semibold" style={{color: 'var(--red, #C1453A)'}}>{item.is_available === false ? 'Currently unavailable' : 'Restaurant not accepting orders'}</div>}
      </div>

      {quantity === 0 ? (
        <button
          type="button"
          disabled={!canOrder}
          onClick={() => canOrder && addItem({id: item.id, name: item.name, price: item.price, restaurantId: restaurant.id, restaurantName: restaurant.name})}
          className="w-7 h-7 rounded-full border flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
          style={{borderColor: 'var(--orange)', color: 'var(--orange)'}}
          aria-label={canOrder ? `Add ${item.name}` : `${item.name} unavailable`}
        >
          <Plus className="w-4 h-4" />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateQuantity(item.id, quantity - 1)}
            className="w-7 h-7 rounded-full border flex items-center justify-center"
            style={{borderColor: 'var(--orange)', color: 'var(--orange)'}}
            aria-label={`Remove one ${item.name}`}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-[12.5px] font-semibold w-4 text-center" style={{color: 'var(--ink)'}}>
            {quantity}
          </span>
          <button
            type="button"
            disabled={!canOrder}
            onClick={() => canOrder && updateQuantity(item.id, quantity + 1)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white disabled:cursor-not-allowed disabled:opacity-40"
            style={{background: 'var(--orange)'}}
            aria-label={canOrder ? `Add one more ${item.name}` : `${item.name} unavailable`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {galleryOpen && imageUrls.length > 0 && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGalleryOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label={`${item.name} photo gallery`} className="relative w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><h2 className="text-sm font-bold text-gray-900">{item.name}</h2><p className="text-xs text-gray-500">Photo {activeImageIndex + 1} of {imageUrls.length}</p></div>
              <button type="button" onClick={() => setGalleryOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100" aria-label="Close photo gallery"><X className="h-5 w-5" /></button>
            </div>
            <div className="aspect-square w-full rounded-xl bg-cover bg-center bg-no-repeat" style={{backgroundImage: `url(${imageUrls[activeImageIndex]}), linear-gradient(135deg, #FFE3C7, #FFD9B3)`}} role="img" aria-label={`${item.name}, photo ${activeImageIndex + 1}`} />
            {imageUrls.length > 1 && <div className="mt-3 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setActiveImageIndex((index) => (index - 1 + imageUrls.length) % imageUrls.length)} className="flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm font-semibold text-gray-800" aria-label="Previous photo"><ChevronLeft className="h-4 w-4" /> Previous</button>
              <div className="flex gap-1.5">{imageUrls.map((url, index) => <button key={url} type="button" onClick={() => setActiveImageIndex(index)} className="h-2.5 w-2.5 rounded-full" style={{background: index === activeImageIndex ? 'var(--orange)' : '#D1D5DB'}} aria-label={`Show photo ${index + 1}`} aria-current={index === activeImageIndex ? 'true' : undefined} />)}</div>
              <button type="button" onClick={() => setActiveImageIndex((index) => (index + 1) % imageUrls.length)} className="flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm font-semibold text-gray-800" aria-label="Next photo">Next <ChevronRight className="h-4 w-4" /></button>
            </div>}
          </section>
        </div>
      )}
    </div>
  );
}
