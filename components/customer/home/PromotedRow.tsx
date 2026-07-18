'use client';

import Link from 'next/link';
import type {RestaurantWithMeta} from '@/lib/customer/types';

interface PromotedRowProps {
  restaurants: RestaurantWithMeta[];
}

export function PromotedRow({restaurants}: PromotedRowProps) {
  if (restaurants.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="font-display text-[15px] font-semibold mb-3" style={{color: 'var(--ink)'}}>
        Promoted near you
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {restaurants.map((r) => (
          <Link key={r.id} href={`/order/restaurant/${r.id}`} className="flex-shrink-0 w-[150px] text-left">
            <div
              className="w-[150px] h-[100px] rounded-xl relative overflow-hidden mb-2 bg-cover bg-center"
              style={
                r.image_url
                  ? {backgroundImage: `url(${r.image_url})`}
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
