'use client';

import PageHeader from '@/components/admin/layout/PageHeader';
import KpiTile from '@/components/restaurant/dashboard/KpiTile';
import MiniPieChart from '@/components/restaurant/dashboard/MiniPieChart';
import OrderCard from '@/components/restaurant/dashboard/OrderCard';
import useRestaurant from '@/hooks/useRestaurant';
import useRestaurantOrders from '@/hooks/useRestaurantOrders';

export default function OrdersPage() {
  const { restaurant, loading: restaurantLoading } = useRestaurant();
  const { active, history, loading, updateStatus, ordersToday, statusBreakdown } = useRestaurantOrders(restaurant?.id);

  if (restaurantLoading || !restaurant) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  const pendingCount = active.filter((o) => o.status === 'placed').length;
  const preparingCount = active.filter((o) => o.status === 'preparing').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Orders" subtitle="Live incoming and in-progress orders" />

      <div className="grid grid-cols-2 gap-3">
        <KpiTile label="New orders" value={String(pendingCount)} />
        <KpiTile label="Preparing" value={String(preparingCount)} />
        <KpiTile label="Orders today" value={String(ordersToday)} />
        <KpiTile label="Active total" value={String(active.length)} />
      </div>

      <div className="p-4 rounded-[12px]" style={{ border: '1px solid var(--line)', background: 'var(--white)' }}>
        <p className="text-[11.5px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>Order status breakdown</p>
        <MiniPieChart data={statusBreakdown} />
      </div>

      <div>
        <p className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>Active orders</p>
        {loading ? (
          <p className="text-[12px] py-4 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>
        ) : active.length === 0 ? (
          <p className="text-[12px] py-4 text-center" style={{ color: 'var(--gray)' }}>No active orders right now.</p>
        ) : (
          <div className="space-y-2.5">
            {active.map((o) => (
              <OrderCard key={o.id} order={o} onUpdateStatus={updateStatus} />
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div>
          <p className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>Recent history</p>
          <div className="space-y-2.5">
            {history.slice(0, 10).map((o) => (
              <OrderCard key={o.id} order={o} onUpdateStatus={updateStatus} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
