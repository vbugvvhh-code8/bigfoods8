'use client';

import Link from 'next/link';
import type {RestaurantWithMeta} from '@/lib/customer/types';

interface RestaurantCardProps {
  restaurant: RestaurantWithMeta & {matchedDish?: {name: string; price: number}};
}

export function RestaurantCard({restaurant: r}: RestaurantCardProps) {
  return (
    <Link href={`/order/restaurant/${r.id}`} className="flex gap-3 items-center py-3 w-full text-left">
      <div
        className="w-14 h-14 rounded-[10px] flex-shrink-0 bg-cover bg-center"
        style={
          r.image_url
            ? {backgroundImage: `url(${r.image_url})`}
            : {background: 'linear-gradient(135deg, #FFE3C7, var(--peach))'}
        }
      />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[13px]" style={{color: 'var(--ink)'}}>
          {r.name}
        </div>
        <div className="flex gap-1.5 items-center text-[11px] flex-wrap" style={{color: 'var(--gray)'}}>
          {r.rating != null && <span className="font-semibold" style={{color: 'var(--orange)'}}>{r.rating}★</span>}
          {r.category && <><Dot />{r.category}</>}
          {r.distanceKm != null && <><Dot />{r.distanceKm.toFixed(1)} km</>}
          {r.etaMinutes != null && <><Dot />~{r.etaMinutes} min</>}
          {!r.isOpenNow && (
            <>
              <Dot />
              <span className="font-semibold" style={{color: 'var(--red, #C1453A)'}}>Closed</span>
            </>
          )}
        </div>
        {r.matchedDish && (
          <div className="text-[10.5px] mt-0.5" style={{color: 'var(--orange-dark)'}}>
            {r.matchedDish.name} · ₦{r.matchedDish.price.toLocaleString()}
          </div>
        )}
      </div>
    </Link>
  );
}

function Dot() {
  return <span className="w-[3px] h-[3px] rounded-full" style={{background: 'var(--line)'}} />;
}
