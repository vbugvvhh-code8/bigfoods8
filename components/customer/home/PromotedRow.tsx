'use client';

import {useEffect} from 'react';
import Link from 'next/link';
import {trackRestaurantEvent} from '@/hooks/useTrackRestaurantEvent';
import type {RestaurantWithMeta} from '@/lib/customer/types';

interface PromotedRowProps {
  restaurants: RestaurantWithMeta[];
}

export function PromotedRow({restaurants}: PromotedRowProps) {
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>('[data-promotion-impression]');
    const tracked = new WeakSet<Element>();
    if (!('IntersectionObserver' in window)) {
      cards.forEach((card) => {
        const id = card.dataset.restaurantId;
        if (id && !tracked.has(card)) {
          tracked.add(card);
          trackRestaurantEvent(id, 'card_impression');
        }
      });
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // A card impression means at least half of the card was visible.
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
        const card = entry.target as HTMLElement;
        const id = card.dataset.restaurantId;
        if (id && !tracked.has(card)) {
          tracked.add(card);
          trackRestaurantEvent(id, 'card_impression');
        }
        observer.unobserve(card);
      });
    }, {threshold: [0, 0.5]});
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [restaurants]);

  if (restaurants.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="font-display text-[15px] font-semibold mb-3" style={{color: 'var(--ink)'}}>
        Promoted near you
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {restaurants.map((r) => (
          <Link key={r.id} href={`/order/restaurant/${r.id}`} data-promotion-impression data-restaurant-id={r.id} onClick={() => trackRestaurantEvent(r.id, 'card_click')} className="flex-shrink-0 w-[150px] text-left">
            <div
              className="w-[150px] h-[100px] rounded-xl relative overflow-hidden mb-2 bg-cover bg-center"
              style={
                r.image_url
                  ? {backgroundImage: `url(${r.image_url}), linear-gradient(135deg, #FFE3C7, #FFD9B3)`}
                  : {background: 'linear-gradient(135deg, var(--peach), #FFD9B3)'}
              }
            >
              <span
                className="absolute top-2 left-2 text-white text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{background: 'var(--orange)'}}
              >
                Promoted
              </span>
            </div>
            <div className="font-semibold text-[12.5px]" style={{color: 'var(--ink)'}}>
              {r.name}
            </div>
            <div className="text-[10.5px]" style={{color: 'var(--gray)'}}>
              {r.category}
              {r.etaMinutes != null ? ` · ~${r.etaMinutes} min` : ''}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
