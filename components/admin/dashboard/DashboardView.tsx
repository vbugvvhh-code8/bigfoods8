'use client';

import KpiGrid from '@/components/admin/dashboard/KpiGrid';
import OrdersChart from '@/components/admin/dashboard/OrdersChart';
import RevenueChart from '@/components/admin/dashboard/RevenueChart';
import ZoneChart from '@/components/admin/dashboard/ZoneChart';
import CancelChart from '@/components/admin/dashboard/CancelChart';

// admin-dashboard v2 returns real computed trend text (or null if there's no
// meaningful comparison) — nothing here is fabricated.
function buildKpiCards(kpis: any) {
  if (!kpis) return [];
  return [
    {
      label: 'Active restaurants',
      value: kpis.active_restaurants ?? 0,
      trend: kpis.new_restaurants_this_week ? `+${kpis.new_restaurants_this_week} this week` : null,
      up: true,
    },
    {
      label: 'Active riders',
      value: kpis.active_riders ?? 0,
      trend: kpis.new_riders_this_week ? `+${kpis.new_riders_this_week} this week` : null,
      up: true,
    },
    { label: 'Orders today', value: kpis.orders_today ?? 0, trend: kpis.orders_trend, up: !kpis.orders_trend?.startsWith('↓') },
    {
      label: 'Revenue today',
      value: `₦${Number(kpis.revenue_today ?? 0).toLocaleString()}`,
      trend: kpis.revenue_trend,
      up: !kpis.revenue_trend?.startsWith('↓'),
    },
    {
      label: 'Avg delivery time',
      value: `${kpis.avg_delivery_minutes_today ?? 0} min`,
      trend: kpis.avg_delivery_trend,
      up: kpis.avg_delivery_trend?.startsWith('↓'), // faster delivery = improvement even though the number went down
    },
  ];
}

export default function DashboardView({ data, loading, error }: any) {
  if (error) {
    return (
      <div className="rounded-xl p-4 text-[13px]" style={{ background: '#FBEAEA', color: '#C1453A', border: '1px solid #F0C6C6' }}>
        Couldn't load dashboard data — {error.message ?? 'please try refreshing.'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-semibold" style={{fontFamily: "'Space Grotesk', sans-serif"}}>Dashboard</h1>
        <p className="text-[11.5px] mt-0.5" style={{color: 'var(--gray)'}}>Platform performance across all zones</p>
      </div>

      <KpiGrid kpis={buildKpiCards(data?.kpis)} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3.5 mb-3.5">
        <div className="rounded-xl p-4" style={{background: 'white', border: '1px solid var(--line)'}}>
          <p className="text-[12.5px] font-semibold">Order volume — last 14 days</p>
          <p className="text-[10.5px] mb-3.5" style={{color: 'var(--gray)'}}>Across all active zones</p>
          <OrdersChart data={data?.trend} />
        </div>
        <div className="rounded-xl p-4" style={{background: 'white', border: '1px solid var(--line)'}}>
          <p className="text-[12.5px] font-semibold">Revenue breakdown</p>
          <p className="text-[10.5px] mb-3.5" style={{color: 'var(--gray)'}}>This month, by stream</p>
          <RevenueChart data={data?.revenue_breakdown} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="rounded-xl p-4" style={{background: 'white', border: '1px solid var(--line)'}}>
          <p className="text-[12.5px] font-semibold">Orders by zone</p>
          <p className="text-[10.5px] mb-3.5" style={{color: 'var(--gray)'}}>Today</p>
          <ZoneChart data={data?.zones} />
        </div>
        <div className="rounded-xl p-4" style={{background: 'white', border: '1px solid var(--line)'}}>
          <p className="text-[12.5px] font-semibold">Rider cancellation rate</p>
          <p className="text-[10.5px] mb-3.5" style={{color: 'var(--gray)'}}>Last 8 weeks</p>
          <CancelChart data={data?.cancellation} />
        </div>
      </div>
    </div>
  );
}
