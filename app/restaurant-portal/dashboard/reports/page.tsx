'use client';

import { useState } from 'react';
import PageHeader from '@/components/admin/layout/PageHeader';
import ReportsList from '@/components/restaurant/dashboard/ReportsList';
import DateRangeFilter from '@/components/restaurant/dashboard/DateRangeFilter';
import KpiTile from '@/components/restaurant/dashboard/KpiTile';
import MiniPieChart from '@/components/restaurant/dashboard/MiniPieChart';
import useRestaurant from '@/hooks/useRestaurant';
import useRestaurantAnalytics, { DateRange } from '@/hooks/useRestaurantAnalytics';

export default function ReportsPage() {
  const { restaurant, loading } = useRestaurant();
  const [range, setRange] = useState<DateRange>('30d');
  const analytics = useRestaurantAnalytics(restaurant?.id, range);

  if (loading || !restaurant) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Menu performance and trends" />

      <div className="flex items-center justify-between">
        <p className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>Item breakdown</p>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiTile label="Total orders" value={String(analytics.ordersCount)} />
        <KpiTile label="Best seller" value={analytics.bestSellingItem ?? '—'} />
      </div>

      <div className="p-4 rounded-[12px]" style={{ border: '1px solid var(--line)', background: 'var(--white)' }}>
        <p className="text-[11.5px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>Sales by item</p>
        {analytics.loading ? (
          <p className="text-[11.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>
        ) : (
          <MiniPieChart data={analytics.itemSales} />
        )}
      </div>

      <ReportsList restaurantId={restaurant.id} />
    </div>
  );
}
