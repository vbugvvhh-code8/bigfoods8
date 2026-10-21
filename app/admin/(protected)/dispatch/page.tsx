'use client';
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';

type DispatchOrder = { id: string; zone: string | null; status: string; payment_status: string | null; delivery_address: string | null; delivery_fee: number | null; rider_id: string | null; placed_at?: string };
type Rider = { id: string; name: string; zone: string | null; status: string; approval_status: string; verification_fee_paid: boolean; waiver_completed: boolean; dispatch_disabled: boolean };
type Setting = { key: string; value: unknown };

export default function AdminDispatchPage() {
  const supabase = getBrowserSupabase();
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [restaurantEnabled, setRestaurantEnabled] = useState(false);
  const [offersEnabled, setOffersEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('dispatch-marketplace', { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  }, [supabase]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call({ action: 'list_admin' });
      setOrders((data.orders ?? []) as DispatchOrder[]);
      setRiders((data.riders ?? []) as Rider[]);
      for (const s of (data.settings ?? []) as Setting[]) {
        const enabled = s.value === true || s.value === 'true';
        if (s.key === 'dispatch_restaurant_assignment_enabled') setRestaurantEnabled(enabled);
        if (s.key === 'dispatch_rider_offers_enabled') setOffersEnabled(enabled);
      }
      setMessage('');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not load dispatch data.'); }
    finally { setLoading(false); }
  }, [call]);

  useEffect(() => { void load(); }, [load]);

  async function toggleSetting(key: string, enabled: boolean) {
    setBusy(key); setMessage('');
    try {
      await call({ action: 'set_setting', key, enabled });
      if (key === 'dispatch_restaurant_assignment_enabled') setRestaurantEnabled(enabled);
      else setOffersEnabled(enabled);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save setting.'); }
    finally { setBusy(''); }
  }

  async function toggleRider(rider: Rider) {
    setBusy(rider.id); setMessage('');
    const disabled = !rider.dispatch_disabled;
    try {
      await call({ action: 'set_rider_disabled', rider_id: rider.id, disabled });
      setRiders(rows => rows.map(row => row.id === rider.id ? { ...row, dispatch_disabled: disabled } : row));
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not update rider.'); }
    finally { setBusy(''); }
  }

  async function assign(order: DispatchOrder, riderId: string) {
    if (!riderId) return;
    setBusy(order.id); setMessage('');
    try {
      await call({ action: 'assign_rider', order_id: order.id, rider_id: riderId });
      setMessage('Rider assigned to order ' + order.id.slice(0, 8));
      await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not assign rider.'); }
    finally { setBusy(''); }
  }

  async function sendOffers(order: DispatchOrder) {
    setBusy('offers-' + order.id); setMessage('');
    try {
      const data = await call({ action: 'create_offers', order_id: order.id });
      setMessage(`Created ${data.offers_created ?? 0} rider offer(s) for order ${order.id.slice(0, 8)}.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not create offers.'); }
    finally { setBusy(''); }
  }

  const eligibleRiders = riders.filter(r => r.status === 'online' && r.approval_status === 'approved' && r.verification_fee_paid && r.waiver_completed && !r.dispatch_disabled);

  return <div className="space-y-6">
    <PageHeader title="Dispatch" subtitle="Assign riders and control dispatch availability" />
    {message && <p role="status" className="rounded-lg p-3 text-sm" style={{ background: 'var(--peach)', color: 'var(--ink)' }}>{message}</p>}
    <section className="rounded-xl p-4 space-y-3" style={{ border: '1px solid var(--line)' }}>
      <h2 className="font-semibold">Dispatch controls</h2>
      <label className="flex items-center justify-between gap-4 text-sm"><span><strong className="block">Restaurant owner assignment</strong><span style={{ color: 'var(--gray)' }}>Allow owners to assign eligible riders to their own orders.</span></span><input type="checkbox" checked={restaurantEnabled} disabled={!!busy} onChange={e => void toggleSetting('dispatch_restaurant_assignment_enabled', e.target.checked)} /></label>
      <label className="flex items-center justify-between gap-4 text-sm"><span><strong className="block">Rider order offers</strong><span style={{ color: 'var(--gray)' }}>Pause or enable rider offer and acceptance.</span></span><input type="checkbox" checked={offersEnabled} disabled={!!busy} onChange={e => void toggleSetting('dispatch_rider_offers_enabled', e.target.checked)} /></label>
    </section>
    <section className="space-y-3">
      <div><h2 className="font-semibold">Unassigned orders ({orders.length})</h2><p className="text-sm" style={{ color: 'var(--gray)' }}>Only paid orders can be assigned or offered. Riders must be online, approved, fee-paid, waiver-complete, enabled, and in the same zone.</p></div>
      {loading ? <p className="py-5 text-center">Loading dispatch data…</p> : orders.length === 0 ? <p className="py-4 text-sm" style={{ color: 'var(--gray)' }}>No unassigned active orders.</p> : orders.map(order => {
        const matching = eligibleRiders.filter(r => (r.zone ?? '').trim().toLowerCase() === (order.zone ?? '').trim().toLowerCase());
        return <article key={order.id} className="rounded-xl p-4 space-y-3" style={{ border: '1px solid var(--line)' }}>
          <div className="flex flex-wrap justify-between gap-2"><strong>Order {order.id.slice(0, 8)}</strong><span className="text-sm">{order.status} · {order.payment_status ?? 'payment unknown'}</span></div>
          <p className="text-sm" style={{ color: 'var(--gray)' }}>{order.zone ?? 'No zone'} · {order.delivery_address ?? 'No delivery address'} · ₦{Number(order.delivery_fee ?? 0).toLocaleString()}</p>
          <div className="flex flex-wrap gap-2"><select aria-label="Select rider" id={'rider-' + order.id} className="min-w-0 flex-1 rounded-lg border p-2 text-sm" defaultValue=""><option value="">Choose eligible rider ({matching.length})</option>{matching.map(r => <option key={r.id} value={r.id}>{r.name} · {r.zone}</option>)}</select><button disabled={!!busy || order.payment_status !== 'paid'} onClick={() => { const el = document.getElementById('rider-' + order.id) as HTMLSelectElement | null; if (el?.value) void assign(order, el.value); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--orange)' }}>{busy === order.id ? 'Assigning…' : 'Assign rider'}</button><button disabled={!!busy || order.payment_status !== 'paid' || !offersEnabled} onClick={() => void sendOffers(order)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">{busy === 'offers-' + order.id ? 'Sending…' : 'Send rider offers'}</button></div>
          {!offersEnabled && <p className="text-xs">Rider offers are paused globally.</p>}
          {order.payment_status !== 'paid' && <p className="text-xs">Assignment and offers are disabled until payment is confirmed.</p>}
        </article>;
      })}
    </section>
    <section className="space-y-3">
      <div><h2 className="font-semibold">Rider dispatch access ({riders.length})</h2><p className="text-sm" style={{ color: 'var(--gray)' }}>Disable a rider here to stop them receiving or accepting offers.</p></div>
      {riders.map(r => <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg p-3" style={{ border: '1px solid var(--line)' }}><div><p className="text-sm font-medium">{r.name}</p><p className="text-xs" style={{ color: 'var(--gray)' }}>{r.zone ?? 'No zone'} · {r.status} · {r.approval_status}</p></div><button disabled={!!busy} onClick={() => void toggleRider(r)} className="rounded-lg border px-3 py-2 text-xs font-semibold">{busy === r.id ? 'Saving…' : r.dispatch_disabled ? 'Enable offers' : 'Disable offers'}</button></div>)}
    </section>
    <button onClick={() => void load()} className="rounded-lg border px-4 py-2 text-sm">Refresh dispatch</button>
  </div>;
}
