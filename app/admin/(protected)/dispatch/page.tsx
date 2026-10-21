'use client';
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';

type DispatchOrder = { id: string; zone: string | null; status: string; payment_status: string | null; delivery_address: string | null; delivery_fee: number | null; rider_id: string | null };
type Rider = { id: string; name: string; zone: string | null; status: string; approval_status: string; verification_fee_paid: boolean; waiver_completed: boolean; dispatch_disabled: boolean };

export default function AdminDispatchPage() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [restaurantEnabled, setRestaurantEnabled] = useState(false);
  const [offersEnabled, setOffersEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const supabase = getBrowserSupabase();

  const load = useCallback(async () => {
    setLoading(true);
    const [orderResult, riderResult, settingResult] = await Promise.all([
      supabase.from('orders').select('id, zone, status, payment_status, delivery_address, delivery_fee, rider_id').in('status', ['placed','preparing']).is('rider_id', null).order('placed_at', { ascending: true }).limit(100),
      supabase.from('riders').select('id, name, zone, status, approval_status, verification_fee_paid, waiver_completed, dispatch_disabled').order('name'),
      supabase.from('platform_settings').select('key,value').in('key', ['dispatch_restaurant_assignment_enabled','dispatch_rider_offers_enabled']),
    ]);
    if (orderResult.error || riderResult.error) setMessage('Could not load dispatch data. Check admin access and database permissions.');
    setOrders((orderResult.data ?? []) as DispatchOrder[]);
    setRiders((riderResult.data ?? []) as Rider[]);
    for (const s of settingResult.data ?? []) {
      const enabled = s.value === true || s.value === 'true';
      if (s.key === 'dispatch_restaurant_assignment_enabled') setRestaurantEnabled(enabled);
      if (s.key === 'dispatch_rider_offers_enabled') setOffersEnabled(enabled);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  async function toggleSetting(key: string, enabled: boolean) {
    setBusy(key); setMessage('');
    const { data, error } = await supabase.rpc('admin_set_dispatch_setting', { p_key: key, p_enabled: enabled });
    if (error || !data?.ok) setMessage(data?.error ?? error?.message ?? 'Could not save setting.');
    else { if (key === 'dispatch_restaurant_assignment_enabled') setRestaurantEnabled(enabled); else setOffersEnabled(enabled); }
    setBusy(''); 
  }

  async function toggleRider(rider: Rider) {
    setBusy(rider.id); setMessage('');
    const disabled = !rider.dispatch_disabled;
    const { data, error } = await supabase.rpc('admin_set_rider_dispatch_disabled', { p_rider_id: rider.id, p_disabled: disabled });
    if (error || !data?.ok) setMessage(data?.error ?? error?.message ?? 'Could not update rider.');
    else setRiders(rows => rows.map(row => row.id === rider.id ? { ...row, dispatch_disabled: disabled } : row));
    setBusy('');
  }

  async function assign(order: DispatchOrder, riderId: string) {
    if (!riderId) return;
    setBusy(order.id); setMessage('');
    const { data, error } = await supabase.rpc('dispatch_assign_rider', { p_order_id: order.id, p_rider_id: riderId });
    if (error || !data?.ok) setMessage(data?.error ?? error?.message ?? 'Could not assign rider.');
    else { setMessage('Rider assigned to order ' + order.id.slice(0,8)); await load(); }
    setBusy('');
  }

  const eligibleRiders = riders.filter(r => r.status === 'online' && r.approval_status === 'approved' && r.verification_fee_paid && r.waiver_completed && !r.dispatch_disabled);

  return <div className="space-y-6">
    <PageHeader title="Dispatch" subtitle="Assign eligible riders and control dispatch availability" />
    {message && <p role="status" className="rounded-lg p-3 text-sm" style={{ background: 'var(--peach)', color: 'var(--ink)' }}>{message}</p>}
    <section className="rounded-xl p-4 space-y-3" style={{ border: '1px solid var(--line)' }}>
      <h2 className="font-semibold">Dispatch controls</h2>
      <label className="flex items-center justify-between gap-4 text-sm"><span><strong className="block">Restaurant owner assignment</strong><span style={{ color: 'var(--gray)' }}>Allow owners to assign eligible riders to their own orders.</span></span><input type="checkbox" checked={restaurantEnabled} disabled={!!busy} onChange={e => void toggleSetting('dispatch_restaurant_assignment_enabled',e.target.checked)} /></label>
      <label className="flex items-center justify-between gap-4 text-sm"><span><strong className="block">Rider order offers</strong><span style={{ color: 'var(--gray)' }}>Allow eligible online riders to receive and accept offers.</span></span><input type="checkbox" checked={offersEnabled} disabled={!!busy} onChange={e => void toggleSetting('dispatch_rider_offers_enabled',e.target.checked)} /></label>
    </section>
    <section className="space-y-3">
      <div><h2 className="font-semibold">Unassigned orders ({orders.length})</h2><p className="text-sm" style={{ color: 'var(--gray)' }}>Only paid orders can be assigned. Rider must be online, approved, paid, waiver-complete and enabled.</p></div>
      {loading ? <p className="py-5 text-center">Loading dispatch data…</p> : orders.length === 0 ? <p className="py-4 text-sm" style={{ color: 'var(--gray)' }}>No unassigned active orders.</p> : orders.map(order => {
        const matching = eligibleRiders.filter(r => (r.zone ?? '').toLowerCase() === (order.zone ?? '').toLowerCase());
        return <article key={order.id} className="rounded-xl p-4 space-y-3" style={{ border: '1px solid var(--line)' }}>
          <div className="flex flex-wrap justify-between gap-2"><strong>Order {order.id.slice(0,8)}</strong><span className="text-sm">{order.status} · {order.payment_status ?? 'payment unknown'}</span></div>
          <p className="text-sm" style={{ color: 'var(--gray)' }}>{order.zone ?? 'No zone'} · {order.delivery_address ?? 'No delivery address'} · ₦{Number(order.delivery_fee ?? 0).toLocaleString()}</p>
          <div className="flex gap-2"><select aria-label="Select rider" id={'rider-'+order.id} className="min-w-0 flex-1 rounded-lg border p-2 text-sm" defaultValue=""><option value="">Choose eligible rider ({matching.length})</option>{matching.map(r => <option key={r.id} value={r.id}>{r.name} · {r.zone}</option>)}</select><button disabled={!!busy || order.payment_status !== 'paid'} onClick={() => { const el = document.getElementById('rider-'+order.id) as HTMLSelectElement | null; if (el?.value) void assign(order,el.value); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--orange)' }}>{busy === order.id ? 'Assigning…' : 'Assign'}</button></div>
          {order.payment_status !== 'paid' && <p className="text-xs">Assignment disabled until payment is confirmed.</p>}
        </article>;
      })}
    </section>
    <section className="space-y-3">
      <div><h2 className="font-semibold">Rider dispatch access ({riders.length})</h2><p className="text-sm" style={{ color: 'var(--gray)' }}>Disable a rider here to stop them receiving offers or assignments.</p></div>
      {riders.map(r => <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg p-3" style={{ border: '1px solid var(--line)' }}><div><p className="text-sm font-medium">{r.name}</p><p className="text-xs" style={{ color: 'var(--gray)' }}>{r.zone ?? 'No zone'} · {r.status} · {r.approval_status}</p></div><button disabled={!!busy} onClick={() => void toggleRider(r)} className="rounded-lg border px-3 py-2 text-xs font-semibold">{busy === r.id ? 'Saving…' : r.dispatch_disabled ? 'Enable offers' : 'Disable offers'}</button></div>)}
    </section>
    <button onClick={() => void load()} className="rounded-lg border px-4 py-2 text-sm">Refresh dispatch</button>
  </div>;
}
