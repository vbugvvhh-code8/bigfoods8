'use client';

import {useRouter} from 'next/navigation';
import {ClipboardList} from 'lucide-react';
import {useMyOrders} from '@/hooks/useMyOrders';
import {AuthGate} from '@/components/customer/shell/AuthGate';
import {OrderHistoryCard} from '@/components/customer/orders/OrderHistoryCard';
import {EmptyState} from '@/components/customer/shared/EmptyState';
import {ErrorState} from '@/components/customer/shared/ErrorState';
import {CardListSkeleton} from '@/components/customer/shared/CardListSkeleton';

function OrdersContent() {
  const router = useRouter();
  const {orders, isLoading, error} = useMyOrders();

  return (
    <div className="w-full max-w-[380px] lg:max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-display text-[19px] font-semibold mb-4" style={{color: 'var(--ink)'}}>
        Your orders
      </h1>

      {isLoading && <CardListSkeleton />}

      {!isLoading && !!error && <ErrorState message="Couldn't load your orders." />}

      {!isLoading && !error && orders.length === 0 && (
        <>
          <EmptyState
            icon={<ClipboardList className="w-5 h-5" />}
            title="No orders yet"
            message="Once you place an order, you'll be able to track it here."
          />
          <button
            onClick={() => router.push('/order')}
            className="w-full py-2.5 rounded-xl text-[12.5px] font-semibold text-white"
            style={{background: 'var(--orange)'}}
          >
            Browse restaurants
          </button>
        </>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="divide-y" style={{borderColor: 'var(--line)'}}>
          {orders.map((order) => (
            <OrderHistoryCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AuthGate>
      <OrdersContent />
    </AuthGate>
  );
}
