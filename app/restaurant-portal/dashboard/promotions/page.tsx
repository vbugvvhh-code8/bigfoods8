'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, Megaphone } from 'lucide-react';
import PageHeader from '@/components/admin/layout/PageHeader';
import DateRangeFilter from '@/components/restaurant/dashboard/DateRangeFilter';
import KpiTile from '@/components/restaurant/dashboard/KpiTile';
import MiniBarChart from '@/components/restaurant/dashboard/MiniBarChart';
import usePricingConfig from '@/hooks/usePricingConfig';
import usePaystackPayment from '@/hooks/usePaystackPayment';
import useRestaurant from '@/hooks/useRestaurant';
import useRestaurantEventStats from '@/hooks/useRestaurantEventStats';
import getBrowserSupabase from '@/lib/supabase/client';
import { PUBLIC_LAUNCH_DATE, isBeforeLaunch } from '@/lib/launchDate';
import type { DateRange } from '@/hooks/useRestaurantAnalytics';

type Plan = '1_day' | '2_days' | '1_week' | '2_weeks' | '1_month';

const PLAN_LABELS: Record<Plan, string> = {
  '1_day': '1 day',
  '2_days': '2 days',
  '1_week': '1 week',
  '2_weeks': '2 weeks',
  '1_month': '1 month',
};
const PRICING_KEY_BY_PLAN: Record<Plan, string> = {
  '1_day': 'promotion_dashboard_1_day',
  '2_days': 'promotion_dashboard_2_days',
  '1_week': 'promotion_dashboard_1_week',
  '2_weeks': 'promotion_dashboard_2_weeks',
  '1_month': 'promotion_dashboard_1_month',
};

interface PromotionRow {
  id: string;
  status: string;
  plan: string;
  starts_at: string | null;
  ends_at: string | null;
  amount_paid: number;
}

export default function PromotionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getBrowserSupabase();

  const { restaurant, loading: restaurantLoading } = useRestaurant();
  const { prices, loading: pricesLoading } = usePricingConfig(Object.values(PRICING_KEY_BY_PLAN));
  const { status: paymentStatus, error: paymentError, startPayment, verifyPayment } = usePaystackPayment();

  const [selectedPlan, setSelectedPlan] = useState<Plan>('1_week');
  const [current, setCurrent] = useState<PromotionRow | null>(null);
  const [history, setHistory] = useState<PromotionRow[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [analyticsRange, setAnalyticsRange] = useState<DateRange>('7d');
  const stats = useRestaurantEventStats(restaurant?.id, analyticsRange);

  const fetchPromotions = useCallback(async () => {
    if (!restaurant?.id) return;
    setLoadingPromotions(true);
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('starts_at', { ascending: false, nullsFirst: false });
    const rows = (data as PromotionRow[]) ?? [];
    const active = rows.find((r) => r.status === 'active' || r.status === 'pending') ?? null;
    setCurrent(active);
    setHistory(rows.filter((r) => r.id !== active?.id));
    setLoadingPromotions(false);
  }, [restaurant?.id, supabase]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  // Handle returning from Paystack
  const reference = searchParams.get('reference');
  useEffect(() => {
    if (!reference) return;
    verifyPayment(reference).then((result) => {
      if (result.success) fetchPromotions();
      router.replace('/restaurant-portal/dashboard/promotions');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  function handleBuy() {
    startPayment('promotion', {
      plan: selectedPlan,
      callbackPath: '/restaurant-portal/dashboard/promotions',
    });
  }

  const isProcessing = paymentStatus === 'starting' || paymentStatus === 'redirecting' || paymentStatus === 'verifying';

  const daysLeft = current?.ends_at
    ? Math.max(0, Math.ceil((new Date(current.ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;
  const hasStarted = current?.starts_at ? new Date(current.starts_at) <= new Date() : false;

  if (restaurantLoading || !restaurant) {
    return <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Promotions" subtitle="Boost your visibility to reach more customers" />

      {loadingPromotions ? (
        <p className="text-[12px] py-4 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>
      ) : current ? (
        <div className="p-4 rounded-[12px]" style={{ border: '1px solid var(--orange)', background: 'var(--peach)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-4 h-4" style={{ color: 'var(--orange)' }} />
            <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
              {hasStarted ? 'Promotion active' : 'Promotion scheduled'}
            </p>
          </div>

          {!hasStarted && isBeforeLaunch() ? (
            <p className="text-[12px] mb-1" style={{ color: 'var(--ink)' }}>
              Your {PLAN_LABELS[current.plan as Plan] ?? current.plan} promotion is paid for and will start counting
              down from launch day —{' '}
              {PUBLIC_LAUNCH_DATE.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}.
            </p>
          ) : (
            <p className="text-[12px] mb-1" style={{ color: 'var(--ink)' }}>
              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left on your {PLAN_LABELS[current.plan as Plan] ?? current.plan} promotion.
            </p>
          )}

          <p className="text-[11px]" style={{ color: 'var(--gray)' }}>
            {current.starts_at && `Starts ${new Date(current.starts_at).toLocaleDateString()}`}
            {current.ends_at && ` · Ends ${new Date(current.ends_at).toLocaleDateString()}`}
          </p>
        </div>
      ) : (
        <p className="text-[12px] p-4 rounded-[12px]" style={{ border: '1px solid var(--line)', color: 'var(--gray)' }}>
          You don't have an active promotion right now.
        </p>
      )}

      {isBeforeLaunch() && (
        <p className="text-[11px] p-2.5 rounded-[9px]" style={{ background: 'var(--peach)', color: 'var(--ink)' }}>
          BigFoods hasn't launched publicly yet — any promotion bought now starts counting on launch day, so you
          never lose paid days waiting.
        </p>
      )}

      <div className="p-4 rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
        <p className="text-[12.5px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>
          {current ? 'Extend or buy another promotion' : 'Promote your restaurant'}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {(Object.keys(PLAN_LABELS) as Plan[]).map((plan) => (
            <button
              key={plan}
              type="button"
              onClick={() => setSelectedPlan(plan)}
              disabled={isProcessing}
              className="py-2.5 px-3 rounded-[9px] text-[12.5px] font-semibold text-left"
              style={{
                border: `1.5px solid ${selectedPlan === plan ? 'var(--orange)' : 'var(--line)'}`,
                background: selectedPlan === plan ? 'var(--white)' : 'transparent',
              }}
            >
              <div>{PLAN_LABELS[plan]}</div>
              <div style={{ color: 'var(--orange)' }}>
                {pricesLoading ? '…' : `₦${prices[PRICING_KEY_BY_PLAN[plan]]?.toLocaleString() ?? '—'}`}
              </div>
            </button>
          ))}
        </div>

        {paymentError && (
          <p className="text-[11px] mb-2" style={{ color: 'var(--red)' }}>{paymentError}</p>
        )}

        <button
          onClick={handleBuy}
          disabled={isProcessing || pricesLoading}
          className="w-full py-3 rounded-[10px] text-[13px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'var(--orange)' }}
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {paymentStatus === 'redirecting'
            ? 'Redirecting to Paystack…'
            : `Buy ${PLAN_LABELS[selectedPlan]} — ₦${prices[PRICING_KEY_BY_PLAN[selectedPlan]]?.toLocaleString() ?? ''}`}
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>Analytics</p>
          <DateRangeFilter value={analyticsRange} onChange={setAnalyticsRange} />
        </div>
        <div className="grid grid-cols-3 gap-2.5 mb-3">
          <KpiTile label="Card clicks" value={String(stats.cardClicks)} />
          <KpiTile label="Page views" value={String(stats.pageViews)} />
          <KpiTile label="Click-through" value={stats.clickThroughRate !== null ? `${stats.clickThroughRate}%` : '—'} />
        </div>
        <div className="p-4 rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
          <p className="text-[11.5px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>Page views trend</p>
          {stats.loading ? (
            <p className="text-[11.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>
          ) : (
            <MiniBarChart data={stats.dailyViews} />
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div>
          <p className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>History</p>
          <div className="space-y-2">
            {history.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-[8px]" style={{ border: '1px solid var(--line)' }}>
                <div>
                  <p className="text-[12px]" style={{ color: 'var(--ink)' }}>
                    {PLAN_LABELS[p.plan as Plan] ?? p.plan} · ₦{Number(p.amount_paid).toLocaleString()}
                  </p>
                  <p className="text-[10.5px]" style={{ color: 'var(--gray)' }}>
                    {p.starts_at ? new Date(p.starts_at).toLocaleDateString() : '—'}
                    {p.ends_at ? ` – ${new Date(p.ends_at).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <span className="text-[10.5px] font-semibold capitalize" style={{ color: 'var(--gray)' }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
