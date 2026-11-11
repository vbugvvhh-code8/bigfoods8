'use client';

import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import type {RestaurantWithMeta} from '@/lib/customer/types';
import {trackRestaurantEvent} from '@/hooks/useTrackRestaurantEvent';

interface PromotedRowProps {
  restaurants: RestaurantWithMeta[];
}

function shuffle<T,>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function PromotedRow({restaurants}: PromotedRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rebaseTimer = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [randomized, setRandomized] = useState(restaurants);
  const idSignature = restaurants.map((r) => r.id).join('|');

  useEffect(() => {
    setRandomized(shuffle(restaurants));
    // A changed active promotion set gets a fresh random order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSignature]);

  const loopedRestaurants = useMemo(
    () => randomized.length > 1
      ? [...randomized, ...randomized, ...randomized]
      : randomized,
    [randomized]
  );

  const centerSlide = (slide: HTMLElement, behavior: ScrollBehavior = 'instant') => {
    const track = trackRef.current;
    if (!track) return;
    const trackRect = track.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();
    const left = track.scrollLeft + slideRect.left - trackRect.left - (track.clientWidth - slideRect.width) / 2;
    track.scrollTo({left, behavior});
  };

  // Start on the middle copy so the carousel can travel in either direction
  // without exposing a beginning or an end.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || randomized.length < 2) return;
    const slides = track.querySelectorAll<HTMLElement>('[data-promotion-slide]');
    const firstMiddleSlide = slides[randomized.length];
    if (firstMiddleSlide) centerSlide(firstMiddleSlide, 'instant');
  }, [randomized]);

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
  }, [loopedRestaurants]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || randomized.length < 2 || paused) return;

    const advance = () => {
      const slides = Array.from(track.querySelectorAll<HTMLElement>('[data-promotion-slide]'));
      if (!slides.length) return;

      const trackRect = track.getBoundingClientRect();
      const center = track.scrollLeft + track.clientWidth / 2;
      let currentIndex = 0;
      let smallestDistance = Number.POSITIVE_INFINITY;

      slides.forEach((slide, index) => {
        const rect = slide.getBoundingClientRect();
        const slideCenter = track.scrollLeft + rect.left - trackRect.left + rect.width / 2;
        const distance = Math.abs(slideCenter - center);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          currentIndex = index;
        }
      });

      const count = randomized.length;
      // When the third copy is reached, jump to the identical card in the
      // middle copy before advancing. The content and position stay identical,
      // so the loop never visibly races back to the first banner.
      if (currentIndex >= count * 2) {
        const equivalent = slides[currentIndex - count];
        if (equivalent) {
          centerSlide(equivalent, 'instant');
          currentIndex -= count;
        }
      }

      const next = slides[currentIndex + 1];
      if (next) centerSlide(next, 'smooth');
    };

    const interval = window.setInterval(advance, 4500);
    return () => window.clearInterval(interval);
  }, [randomized.length, paused]);

  useEffect(() => () => {
    if (rebaseTimer.current != null) window.clearTimeout(rebaseTimer.current);
  }, []);

  if (restaurants.length === 0) return null;

  return (
    <section className="mt-1 mb-5" aria-label="Featured restaurants">
      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide px-[8%] mx-0"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        style={{scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'}}
      >
        {loopedRestaurants.map((r, index) => (
          <Link
            key={`${r.id}-loop-${index}`}
            href={`/order/restaurant/${r.id}`}
            data-promotion-slide
            data-promotion-impression
            data-restaurant-id={r.id}
            onClick={() => trackRestaurantEvent(r.id, 'card_click')}
            className="flex-shrink-0 w-[84%] max-w-[340px] snap-center text-left"
          >
            <div
              className="w-full h-[140px] sm:h-[150px] rounded-xl relative overflow-hidden bg-cover bg-center"
              style={
                r.image_url
                  ? {backgroundImage: `url(${r.image_url}), linear-gradient(135deg, #FFE3C7, #FFD9B3)`}
                  : {background: 'linear-gradient(135deg, var(--peach), #FFD9B3)'}
              }
            >
              <div
                className="absolute inset-0"
                style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.02) 20%, rgba(0,0,0,0.78) 100%)'}}
              />
              <div className="absolute bottom-0 left-0 right-0 flex items-end gap-3 p-3">
                <div
                  className="w-11 h-11 shrink-0 overflow-hidden rounded-lg flex items-center justify-center"
                  style={{background: '#FFFFFF', border: '1px solid rgba(255,255,255,0.8)'}}
                >
                  {r.logo_url ? (
                    <img src={r.logo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-xs font-bold" style={{color: '#C2410C'}}>BF</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[14px] leading-tight text-white truncate">
                    {r.name}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10.5px] text-white/90">
                    {r.category && <span>{r.category}</span>}
                    {r.distanceKm != null && (
                      <>
                        {r.category && <span aria-hidden="true">·</span>}
                        <span>{r.distanceKm.toFixed(1)} km</span>
                      </>
                    )}
                    {r.etaMinutes != null && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>~{r.etaMinutes} min</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
