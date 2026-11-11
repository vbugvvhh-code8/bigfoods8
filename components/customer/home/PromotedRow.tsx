'use client';

import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import type {RestaurantWithMeta} from '@/lib/customer/types';
import {trackRestaurantEvent} from '@/hooks/useTrackRestaurantEvent';

interface PromotedRowProps {
  restaurants: RestaurantWithMeta[];
}

export function PromotedRow({restaurants}: PromotedRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const cards = trackRef.current?.querySelectorAll<HTMLElement>('[data-promotion-impression]');
    if (!cards?.length) return;

    const tracked = new WeakSet<Element>();
    if (!('IntersectionObserver' in window)) {
      cards.forEach((card) => {
        const id = card.dataset.restaurantId;
        if (id) {
          tracked.add(card);
          trackRestaurantEvent(id, 'card_impression');
        }
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
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

  useEffect(() => {
    const track = trackRef.current;
    if (!track || restaurants.length < 2 || paused) return;

    const advance = () => {
      const slides = Array.from(track.querySelectorAll<HTMLElement>('[data-promotion-slide]'));
      if (!slides.length) return;

      const trackRect = track.getBoundingClientRect();
      const center = track.scrollLeft + track.clientWidth / 2;
      let currentIndex = 0;
      let smallestDistance = Number.POSITIVE_INFINITY;

      slides.forEach((slide, index) => {
        const slideRect = slide.getBoundingClientRect();
        const slideCenter = track.scrollLeft + slideRect.left - trackRect.left + slideRect.width / 2;
        const distance = Math.abs(slideCenter - center);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          currentIndex = index;
        }
      });

      const next = slides[(currentIndex + 1) % slides.length];
      const nextRect = next.getBoundingClientRect();
      const left = track.scrollLeft + nextRect.left - trackRect.left - (track.clientWidth - nextRect.width) / 2;
      track.scrollTo({left, behavior: 'smooth'});
    };

    const interval = window.setInterval(advance, 5000);
    return () => window.clearInterval(interval);
  }, [restaurants.length, paused]);

  if (restaurants.length === 0) return null;

  return (
    <section className="mt-1 mb-5" aria-label="Promoted restaurants">
      <div className="flex items-baseline justify-between px-0 mb-3">
        <h2 className="font-display text-[15px] font-semibold" style={{color: 'var(--ink)'}}>
          Promoted near you
        </h2>
        {restaurants.length > 1 && (
          <span className="text-[10px]" style={{color: 'var(--gray)'}}>Swipe to explore</span>
        )}
      </div>

      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide px-[9%] -mx-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        style={{scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'}}
      >
        {restaurants.map((r) => (
          <Link
            key={r.id}
            href={`/order/restaurant/${r.id}`}
            data-promotion-slide
            data-promotion-impression
            data-restaurant-id={r.id}
            onClick={() => trackRestaurantEvent(r.id, 'card_click')}
            className="flex-shrink-0 w-[82%] max-w-[320px] snap-center text-left"
          >
            <div
              className="w-full h-[170px] rounded-2xl relative overflow-hidden mb-2 bg-cover bg-center"
              style={
                r.image_url
                  ? {backgroundImage: `url(${r.image_url}), linear-gradient(135deg, #FFE3C7, #FFD9B3)`}
                  : {background: 'linear-gradient(135deg, var(--peach), #FFD9B3)'}
              }
            >
              <span
                className="absolute top-3 left-3 text-white text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{background: 'var(--orange)'}}
              >
                Promoted
              </span>
            </div>
            <div className="font-semibold text-[13px]" style={{color: 'var(--ink)'}}>
              {r.name}
            </div>
            <div className="text-[11px]" style={{color: 'var(--gray)'}}>
              {r.category}
              {r.etaMinutes != null ? ` · ~${r.etaMinutes} min` : ''}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
