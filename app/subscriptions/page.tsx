'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CalendarDays, Loader2, Pause, Play, Plus, RefreshCw, XCircle } from 'lucide-react';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';

type Subscription = {
  id: string;
  restaurant_id: string;
  package_weeks: number;
  delivery_days: number[];
  delivery_time: string;
  selected_items: {
    menu_item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    selected_options?: { groupName: string; optionName: string; quantity: number; price: number }[];
  }[];
  total_deliveries: number;
  total_amount: number;
  status: string;
  starts_on: string | null;
  ends_on: string | null;
  paid_at: string | null;
  created_at: string;
  restaurant?: { name: string } | null;
};
const DAY_OPTIONS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 7, label: 'Sun' },
];
const money = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

export default function SubscriptionsPage() {
  const [supabase] = useState(() => getBrowserSupabase());
  const [userId, setUserId] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('meal_subscriptions')
      .select('id,restaurant_id,package_weeks,delivery_days,delivery_time,selected_items,total_deliveries,total_amount,status,starts_on,ends_on,paid_at,created_at,restaurants(name)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (queryError) setError('Could not load your meal packages. Please refresh and try again.');
    else setSubscriptions((data ?? []).map((row: any) => ({ ...row, restaurant: row.restaurants })) as Subscription[]);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (user) await loadSubscriptions();
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [supabase, loadSubscriptions]);

  async function manage(subscriptionId: string, status: 'active' | 'paused' | 'cancelled') {
    setBusy(true); setError(null); setNotice(null);
    const { data, error: invokeError } = await supabase.functions.invoke('meal-subscription-payment', {
      body: { action: 'manage', subscription_id: subscriptionId, status },
    });
    if (invokeError || !data?.success) setError(data?.error ?? invokeError?.message ?? 'Could not update this subscription.');
    else { setNotice('Subscription updated: ' + status + '.'); await loadSubscriptions(); }
    setBusy(false);
  }

  if (loading) return <div className="mx-auto max-w-5xl p-6"><p className="py-16 text-center text-sm text-gray-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading meal packages…</p></div>;

  return <div className="mx-auto max-w-5xl p-4 pb-28 sm:p-6">
    <PageHeader title="Meal subscriptions" subtitle="Manage your prepaid meal packages and delivery schedules." />
    {error && <p role="alert" className="mb-4 rounded-xl p-4 text-sm" style={{ background: '#FCE8E6', color: '#B42318' }}>{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-xl p-4 text-sm" style={{ background: '#E7F6EC', color: '#207245' }}><CheckCircle2 className="mr-2 inline h-4 w-4" />{notice}</p>}
    {!userId ? <div className="rounded-2xl border bg-white p-6" style={{ borderColor: 'var(--line)' }}>
      <p className="text-sm text-gray-600">Sign in to view or create meal subscriptions.</p>
      <Link href="/login?next=%2Fsubscriptions" className="mt-4 inline-flex rounded-xl px-4 py-3 text-sm font-bold text-white" style={{ background: 'var(--orange)' }}>Sign in</Link>
    </div> : <>
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" style={{ borderColor: '#FED7AA', background: 'linear-gradient(110deg,#FFF7ED,#FFFFFF)' }}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: '#FFEDD5', color: '#C2410C' }}><CalendarDays className="h-5 w-5" /></span>
          <div><h2 className="font-bold" style={{ color: '#9A3412' }}>Plan your meals ahead</h2><p className="mt-1 text-sm" style={{ color: '#7C5A46' }}>Choose your meals, variants and delivery days, then pay upfront.</p></div>
        </div>
        <Link href="/subscriptions/new" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white" style={{ background: 'var(--orange)' }}><Plus className="h-4 w-4" />Add meal subscription</Link>
      </div>
      <section id="your-packages" className="scroll-mt-24 p-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold">Your meal packages</h2><p className="mt-1 text-sm text-gray-500">Review package details and manage upcoming schedules.</p></div>
          <button type="button" onClick={() => void loadSubscriptions()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--line)' }}><RefreshCw className="h-3.5 w-3.5" />Refresh</button>
        </div>
        {subscriptions.length === 0 ? <div className="rounded-xl p-6 text-center" style={{ background: '#F8F6F3' }}>
          <CalendarDays className="mx-auto h-8 w-8 text-gray-400" /><p className="mt-3 font-semibold">No meal packages yet</p><p className="mt-1 text-sm text-gray-500">Create a package to choose meals and set your delivery schedule.</p>
          <Link href="/subscriptions/new" className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white" style={{ background: 'var(--orange)' }}><Plus className="h-4 w-4" />Add meal subscription</Link>
        </div> : <div className="grid gap-4 md:grid-cols-2">{subscriptions.map(sub => <article key={sub.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{sub.restaurant?.name ?? 'Kitchen'}</h3><p className="mt-1 text-xs text-gray-500">{sub.package_weeks} week(s) · {sub.total_deliveries} deliveries · {sub.delivery_time}</p></div>
            <span className="rounded-full px-2.5 py-1 text-xs font-bold capitalize" style={{ background: sub.status === 'active' ? '#E7F6EC' : sub.status === 'paused' ? '#FFF0E5' : '#F1F1F1', color: sub.status === 'active' ? '#207245' : sub.status === 'paused' ? '#B45309' : '#555' }}>{sub.status.replaceAll('_', ' ')}</span>
          </div>
          <p className="mt-3 text-sm font-semibold">{money(Number(sub.total_amount))} package total</p>
          <p className="mt-1 text-xs text-gray-500">Schedule: {sub.delivery_days.map(d => DAY_OPTIONS.find(x => x.value === d)?.label).filter(Boolean).join(', ')} · {sub.starts_on ?? 'Start pending'} to {sub.ends_on ?? 'End pending'}</p>
          <div className="mt-3 space-y-1">{(sub.selected_items ?? []).map(item => <div key={item.menu_item_id} className="text-xs text-gray-600"><p>{item.quantity} × {item.name}</p>{(item.selected_options ?? []).map(option => <p key={option.optionName} className="ml-3 text-[11px]">↳ {option.groupName}: {option.quantity} × {option.optionName}{option.price > 0 ? ' (+' + money(option.price) + ')' : ''}</p>)}</div>)}</div>
          {sub.status === 'active' && <div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={() => void manage(sub.id, 'paused')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--line)' }}><Pause className="h-3 w-3" />Pause</button><button type="button" disabled={busy} onClick={() => { if (window.confirm('Cancel this package and cancel its remaining scheduled deliveries?')) void manage(sub.id, 'cancelled'); }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--line)' }}><XCircle className="h-3 w-3" />Cancel</button></div>}
          {sub.status === 'paused' && <button type="button" disabled={busy} onClick={() => void manage(sub.id, 'active')} className="mt-4 inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--line)' }}><Play className="h-3 w-3" />Resume</button>}
        </article>)}</div>}
      </section>
    </>}
  </div>;
}
