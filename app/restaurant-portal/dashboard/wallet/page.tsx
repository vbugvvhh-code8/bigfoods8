'use client';

import { useState } from 'react';
import PageHeader from '@/components/admin/layout/PageHeader';
import WalletCard from '@/components/restaurant/dashboard/WalletCard';
import DateRangeFilter from '@/components/restaurant/dashboard/DateRangeFilter';
import KpiTile from '@/components/restaurant/dashboard/KpiTile';
import MiniBarChart from '@/components/restaurant/dashboard/MiniBarChart';
import useRestaurant from '@/hooks/useRestaurant';
import useRestaurantAnalytics, { DateRange } from '@/hooks/useRestaurantAnalytics';

export default function WalletPage() {
  const { restaurant, loading } = useRestaurant();
  const [range, setRange] = useState<DateRange>('7d');
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
      <PageHeader title="Wallet" subtitle="Your balance and earnings" />

      <WalletCard restaurantId={restaurant.id} />

      <div className="flex items-center justify-between pt-2">
        <p className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>Earnings</p>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiTile label="Earned this period" value={`₦${analytics.totalEarnings.toLocaleString()}`} />
        <KpiTile label="Orders delivered" value={String(analytics.deliveredCount)} />
      </div>

      <div className="p-4 rounded-[12px]" style={{ border: '1px solid var(--line)', background: 'var(--white)' }}>
        <p className="text-[11.5px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>Earnings trend</p>
        {analytics.loading ? (
          <p className="text-[11.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>
        ) : (
          <MiniBarChart data={analytics.dailyRevenue} />
        )}
      </div>
    </div>
  );
}
