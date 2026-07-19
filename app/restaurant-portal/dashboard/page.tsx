'use client';

import { useState } from 'react';
import PageHeader from '@/components/admin/layout/PageHeader';
import RiderEtaBadge from '@/components/restaurant/dashboard/RiderEtaBadge';
import AcceptingHoursCard from '@/components/restaurant/dashboard/AcceptingHoursCard';
import LaunchBanner from '@/components/restaurant/dashboard/LaunchBanner';
import DateRangeFilter from '@/components/restaurant/dashboard/DateRangeFilter';
import KpiTile from '@/components/restaurant/dashboard/KpiTile';
import MiniBarChart from '@/components/restaurant/dashboard/MiniBarChart';
import MiniPieChart from '@/components/restaurant/dashboard/MiniPieChart';
import useRestaurant from '@/hooks/useRestaurant';
import useRestaurantAnalytics, { DateRange } from '@/hooks/useRestaurantAnalytics';

const STATUS_COPY: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending review', color: 'var(--orange)' },
  approved: { label: 'Approved', color: 'var(--green)' },
  rejected: { label: 'Not approved', color: 'var(--red)' },
};

export default function DashboardOverviewPage() {
  const { restaurant, loading, refresh } = useRestaurant();
  const [range, setRange] = useState<DateRange>('7d');
  const analytics = useRestaurantAnalytics(restaurant?.id, range);

  if (loading || !restaurant) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  const status = STATUS_COPY[restaurant.approval_status] ?? { label: restaurant.approval_status, color: 'var(--gray)' };

  return (
    <div className="space-y-4">
      <PageHeader title="Overview" subtitle="Your restaurant at a glance" />

      <LaunchBanner />

      <div className="p-4 rounded-[12px]" style={{ border: '1px solid var(--line)', background: 'var(--white)' }}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[17px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {restaurant.name}
          </h1>
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--peach)', color: status.color }}>
            {status.label}
          </span>
        </div>
        <p className="text-[12px] mb-2" style={{ color: 'var(--gray)' }}>
          {restaurant.category} · {restaurant.address}
        </p>
        <RiderEtaBadge latitude={restaurant.latitude ?? undefined} longitude={restaurant.longitude ?? undefined} />
      </div>

      <AcceptingHoursCard restaurant={restaurant} onUpdated={() => refresh()} />

      {restaurant.approval_status === 'pending' && (
        <div className="p-3 rounded-[10px]" style={{ background: 'var(--peach)' }}>
          <p className="text-[12px]" style={{ color: 'var(--ink)' }}>
            Your restaurant is awaiting admin review. You'll be notified once it's approved.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>Performance</p>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiTile label="Total earnings" value={`₦${analytics.totalEarnings.toLocaleString()}`} />
        <KpiTile label="Orders" value={String(analytics.ordersCount)} sub={`${analytics.deliveredCount} delivered`} />
        <KpiTile label="Best seller" value={analytics.bestSellingItem ?? '—'} />
        <KpiTile label="Avg delivery" value={analytics.avgDeliveryMinutes ? `${analytics.avgDeliveryMinutes} min` : '—'} />
      </div>

      <div className="p-4 rounded-[12px]" style={{ border: '1px solid var(--line)', background: 'var(--white)' }}>
        <p className="text-[11.5px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>Revenue trend</p>
        {analytics.loading ? (
          <p className="text-[11.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>
        ) : (
          <MiniBarChart data={analytics.dailyRevenue} />
        )}
      </div>

      <div className="p-4 rounded-[12px]" style={{ border: '1px solid var(--line)', background: 'var(--white)' }}>
        <p className="text-[11.5px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>Top-selling items</p>
        {analytics.loading ? (
          <p className="text-[11.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>
        ) : (
          <MiniPieChart data={analytics.itemSales} />
        )}
      </div>
    </div>
  );
}
