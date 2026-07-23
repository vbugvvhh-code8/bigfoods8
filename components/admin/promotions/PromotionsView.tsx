'use client';

import { useEffect, useMemo, useState } from 'react';
import PromotionRow from './PromotionRow';
import getBrowserSupabase from '@/lib/supabase/client';

interface EventRow {
  restaurant_id: string;
  event_type: string;
  restaurants: { name: string } | null;
}

export default function PromotionsView({ promotions = [], loading = false, error }: any) {
  const supabase = getBrowserSupabase();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    supabase
      .from('restaurant_events')
      .select('restaurant_id, event_type, restaurants(name)')
      .gte('created_at', since.toISOString())
      .then(({ data }) => {
        setEvents((data as any[]) ?? []);
        setEventsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const activeCount = promotions.filter((p: any) => p.status === 'active').length;
    const totalRevenue = promotions.reduce((sum: number, p: any) => sum + Number(p.amount_paid ?? 0), 0);
    const pendingCount = promotions.filter((p: any) => p.status === 'pending').length;
    return { activeCount, totalRevenue, pendingCount };
  }, [promotions]);

  const leaderboard = useMemo(() => {
    const totals: Record<string, { name: string; clicks: number; views: number }> = {};
    for (const e of events) {
      const key = e.restaurant_id;
      if (!totals[key]) totals[key] = { name: e.restaurants?.name ?? 'Unknown', clicks: 0, views: 0 };
      if (e.event_type === 'card_click') totals[key].clicks += 1;
      if (e.event_type === 'page_view') totals[key].views += 1;
    }
    return Object.values(totals)
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }, [events]);

  if (error) {
    return (
      <div className="rounded-xl p-4 text-[13px]" style={{ background: '#FBEAEA', color: '#C1453A', border: '1px solid #F0C6C6' }}>
        Couldn't load promotions — {error.message ?? 'please try refreshing.'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Promotions</h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--gray)' }}>Restaurant promotion subscriptions</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <SummaryTile label="Active promotions" value={String(summary.activeCount)} />
        <SummaryTile label="Total revenue" value={`₦${summary.totalRevenue.toLocaleString()}`} />
        <SummaryTile label="Awaiting review" value={String(summary.pendingCount)} />
      </div>

      <div className="rounded-xl p-4 mb-4" style={{ background: 'white', border: '1px solid var(--line)' }}>
        <p className="text-[12.5px] font-semibold mb-3">Top restaurants — last 30 days</p>
        {eventsLoading ? (
          <p className="text-[12.5px]" style={{ color: 'var(--gray)' }}>Loading…</p>
        ) : leaderboard.length === 0 ? (
          <p className="text-[12.5px]" style={{ color: 'var(--gray)' }}>No activity recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((r, i) => (
              <div key={r.name + i} className="flex items-center justify-between text-[12.5px]">
                <span>{i + 1}. {r.name}</span>
                <span style={{ color: 'var(--gray)' }}>{r.views} views · {r.clicks} clicks</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl p-4" style={{ background: 'white', border: '1px solid var(--line)' }}>
        <p className="text-[12.5px] font-semibold mb-3">Approval queue</p>
        {loading && <div className="text-[13px]" style={{ color: 'var(--gray)' }}>Loading…</div>}
        {!loading && promotions.length === 0 && <div className="text-[13px]" style={{ color: 'var(--gray)' }}>No promotions yet</div>}
        {!loading && promotions.map((p: any) => <PromotionRow key={p.id} promotion={p} />)}
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: 'white', border: '1px solid var(--line)' }}>
      <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--gray)' }}>{label}</p>
      <p className="text-[16px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{value}</p>
    </div>
  );
}
