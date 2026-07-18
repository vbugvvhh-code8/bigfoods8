'use client';

import Link from 'next/link';
import {useCart} from '@/hooks/useCart';

export function OrderTray() {
  const {count, total} = useCart();

  if (count === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-0 right-0 px-4 pointer-events-none z-30">
      <div className="max-w-[380px] lg:max-w-2xl mx-auto">
        <Link
          href="/order/checkout"
          className="flex items-center justify-between rounded-xl px-4 py-3 pointer-events-auto text-white"
          style={{background: 'var(--ink)', boxShadow: '0 10px 30px rgba(32,28,26,0.25)'}}
        >
          <div className="text-[12px]">
            <b className="font-display text-[14px] block">
              {count} item{count !== 1 ? 's' : ''}
            </b>
            View cart
          </div>
          <div className="text-[12px] font-semibold flex items-center gap-1.5" style={{color: 'var(--orange)'}}>
            <span>₦{total.toLocaleString()}</span>
            <span>→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
