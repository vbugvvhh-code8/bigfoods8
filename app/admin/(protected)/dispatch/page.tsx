'use client';
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';

type DispatchOrder = { id: string; zone: string | null; status: string; payment_status: string | null; delivery_address: string | null; delivery_fee: number | null; rider_id: string | null; placed_at?: string };
type Rider = { id: string; name: string; zone: string | null; status: string; approval_status: string; verification_fee_paid: boolean; waiver_completed: boolean; dispatch_disabled: boolean };
type Setting = { key: string; value: unknown };

function DispatchSwitch({ checked, disabled, onChange, label }: { checked: boolean; disabled: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
      style={{ background: checked ? '#16A36A' : '#B8B0A8' }}
    >
      <span className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: checked ? '25px' : '4px' }} />
    </button>
  );
}

export default function AdminDispatchPage() {
  const supabase = getBrowserSupabase();
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [restaurantEnabled, setRestaurantEnabled] = useState(false);
  const [riderSelfAssignmentEnabled, setRiderSelfAssignmentEnabled] = useState(false);
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
        if (s.key === 'dispatch_rider_offers_enabled') setRiderSelfAssignmentEnabled(enabled);
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
      if (key === 'dispatch_rider_offers_enabled') setRiderSelfAssignmentEnabled(enabled);
      setMessage(enabled
        ? key === 'dispatch_rider_offers_enabled' ? 'Rider self-assignment is enabled.' : 'Restaurant owner assignment is enabled.'
        : key === 'dispatch_rider_offers_enabled' ? 'Rider self-assignment is disabled. Admins can still assign riders manually.' : 'Restaurant owner assignment is disabled.');
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

  const eligibleRiders = riders.filter(r => r.status === 'online' && r.approval_status === 'approved' && r.waiver_completed && !r.dispatch_disabled);

  return <div className="space-y-6">
    <PageHeader title="Dispatch" subtitle="Choose who can assign riders and control dispatch availability" />
    {message && <p role="status" className="rounded-lg p-3 text-sm" style={{ background: 'var(--peach)', color: 'var(--ink)' }}>{message}</p>}
    <section className="rounded-xl p-4 space-y-4" style={{ border: '1px solid var(--line)', background: 'white' }}>
      <div>
        <h2 className="font-semibold">Dispatch controls</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--gray)' }}>Choose whether riders may accept eligible orders themselves or whether assignment stays with admins and restaurant owners.</p>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-xl p-3" style={{ background: '#F8F5F1' }}>
        <span className="min-w-0 text-sm"><strong className="block">Rider self-assignment</strong><span style={{ color: 'var(--gray)' }}>{riderSelfAssignmentEnabled ? 'Riders can accept eligible offers in their service area.' : 'Off — riders cannot self-assign. Admins can still assign riders manually.'}</span></span>
        <DispatchSwitch label="Allow riders to self-assign orders" checked={riderSelfAssignmentEnabled} disabled={!!busy || loading} onChange={enabled => void toggleSetting('dispatch_rider_offers_enabled', enabled)} />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-xl p-3" style={{ background: '#F8F5F1' }}>
        <span className="min-w-0 text-sm"><strong className="block">Restaurant owner assignment</strong><span style={{ color: 'var(--gray)' }}>{restaurantEnabled ? 'Restaurant owners can assign eligible riders to their own orders.' : 'Off — restaurant owners cannot assign riders; admins can assign them here.'}</span></span>
        <DispatchSwitch label="Allow restaurant owners to assign riders" checked={restaurantEnabled} disabled={!!busy || loading} onChange={enabled => void toggleSetting('dispatch_restaurant_assignment_enabled', enabled)} />
      </div>
    </section>
    <section className="space-y-3">
      <div><h2 className="font-semibold">Unassigned orders ({orders.length})</h2><p className="text-sm" style={{ color: 'var(--gray)' }}>Customer checkout payment must be confirmed. Riders must be online, approved, waiver-complete, enabled, and in the same zone.</p></div>
      {loading ? <p className="py-5 text-center">Loading dispatch data…</p> : orders.length === 0 ? <p className="py-4 text-sm" style={{ color: 'var(--gray)' }}>No unassigned active orders.</p> : orders.map(order => {
        const matching = eligibleRiders.filter(r => (r.zone ?? '').trim().toLowerCase() === (order.zone ?? '').trim().toLowerCase());
        return <article key={order.id} className="rounded-xl p-4 space-y-3" style={{ border: '1px solid var(--line)' }}>
          <div className="flex flex-wrap justify-between gap-2"><strong>Order {order.id.slice(0, 8)}</strong><span className="text-sm">{order.status} · {order.payment_status ?? 'payment unknown'}</span></div>
          <p className="text-sm" style={{ color: 'var(--gray)' }}>{order.zone ?? 'No zone'} · {order.delivery_address ?? 'No delivery address'} · ₦{Number(order.delivery_fee ?? 0).toLocaleString()}</p>
          <div className="flex flex-wrap gap-2"><select aria-label="Select rider" id={'rider-' + order.id} className="min-w-0 flex-1 rounded-lg border p-2 text-sm" defaultValue=""><option value="">Choose eligible rider ({matching.length})</option>{matching.map(r => <option key={r.id} value={r.id}>{r.name} · {r.zone}</option>)}</select><button disabled={!!busy || order.payment_status !== 'paid'} onClick={() => { const el = document.getElementById('rider-' + order.id) as HTMLSelectElement | null; if (el?.value) void assign(order, el.value); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--orange)' }}>{busy === order.id ? 'Assigning…' : 'Assign rider'}</button></div>
          {order.payment_status !== 'paid' && <p className="text-xs">Assignment and offers are disabled until payment is confirmed.</p>}
        </article>;
      })}
    </section>
    <section className="space-y-3">
      <div><h2 className="font-semibold">Rider dispatch access ({eligibleRiders.length})</h2><p className="text-sm" style={{ color: 'var(--gray)' }}>Disable a rider here to stop them receiving or accepting offers.</p></div>
      {eligibleRiders.map(r => <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg p-3" style={{ border: '1px solid var(--line)' }}><div><p className="text-sm font-medium">{r.name}</p><p className="text-xs" style={{ color: 'var(--gray)' }}>{r.zone ?? 'No zone'} · Online · {r.approval_status}</p></div><button disabled={!!busy} onClick={() => void toggleRider(r)} className="rounded-lg border px-3 py-2 text-xs font-semibold">{busy === r.id ? 'Saving…' : r.dispatch_disabled ? 'Enable offers' : 'Disable offers'}</button></div>)}
    </section>
    <button onClick={() => void load()} className="rounded-lg border px-4 py-2 text-sm">Refresh dispatch</button>
  </div>;
}
