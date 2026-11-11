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
        className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #FFE3C7, var(--peach))', border: '1px solid var(--line)' }}
      >
        {r.logo_url ? (
          <img src={r.logo_url} alt={`${r.name} logo`} className="w-full h-full object-cover" loading="lazy" />
        ) : r.image_url ? (
          <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-[10px] font-semibold" style={{ color: 'var(--orange-dark)' }}>BF</span>
        )}
      </div>
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
