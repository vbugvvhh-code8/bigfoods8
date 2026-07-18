'use client';

import Link from 'next/link';
import {ChevronRight} from 'lucide-react';
import type {OrderWithRestaurant} from '@/hooks/useMyOrders';

const STATUS_LABEL: Record<string, string> = {
  placed: 'Placed',
  preparing: 'Preparing',
  picked_up: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const ACTIVE_STATUSES = ['placed', 'preparing', 'picked_up'];

export function OrderHistoryCard({order}: {order: OrderWithRestaurant}) {
  const isActive = ACTIVE_STATUSES.includes(order.status);
  const total = order.subtotal + order.platform_fee + (order.delivery_fee ?? 0) + (order.tip_amount ?? 0);

  return (
    <Link href={`/order/track/${order.id}`} className="flex items-center gap-3 py-3.5 w-full text-left">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[13px] truncate" style={{color: 'var(--ink)'}}>
            {order.restaurantName ?? 'Restaurant'}
          </span>
          <span
            className="flex-shrink-0 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
            style={
              isActive
                ? {background: 'var(--peach)', color: 'var(--orange-dark)'}
                : order.status === 'cancelled'
                ? {background: '#FBEAE8', color: '#C1453A'}
                : {background: '#EFF3EF', color: '#3D7A4E'}
            }
          >
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
        <div className="text-[11px] mt-0.5" style={{color: 'var(--gray)'}}>
          {order.itemCount} item{order.itemCount !== 1 ? 's' : ''} · ₦{total.toLocaleString()} ·{' '}
          {new Date(order.placed_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{color: 'var(--gray)'}} />
    </Link>
  );
}
