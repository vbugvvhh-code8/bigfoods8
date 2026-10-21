'use client';

import { useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import { Clock, Bike } from 'lucide-react';
import type { OrderWithRider } from '@/hooks/useRestaurantOrders';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  placed: { label: 'New order', color: 'var(--orange)' },
  preparing: { label: 'Preparing', color: 'var(--orange)' },
  picked_up: { label: 'With rider', color: 'var(--teal)' },
  delivered: { label: 'Delivered', color: 'var(--green)' },
  cancelled: { label: 'Cancelled', color: 'var(--red)' },
};

export default function OrderCard({
  order,
  onUpdateStatus,
}: {
  order: OrderWithRider;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assignmentEnabled, setAssignmentEnabled] = useState(false);
  const [assignmentReady, setAssignmentReady] = useState(false);
  const [eligibleRiders, setEligibleRiders] = useState<{ id: string; name: string; zone: string | null }[]>([]);
  const [selectedRider, setSelectedRider] = useState('');
  const [assignmentMessage, setAssignmentMessage] = useState('');
  useEffect(() => {
    if (order.rider_id || !['placed', 'preparing'].includes(order.status)) return;
    setAssignmentReady(false);
    void (async () => {
      const { data, error } = await getBrowserSupabase().functions.invoke('dispatch-marketplace', {
        body: { action: 'restaurant_assignment_options', order_id: order.id },
      });
      if (error || data?.error) {
        setAssignmentMessage(data?.error ?? 'Could not load rider assignment options. Please refresh.');
        setAssignmentReady(true);
        return;
      }
      setAssignmentEnabled(data?.assignment_enabled === true);
      setEligibleRiders((data?.riders ?? []) as { id: string; name: string; zone: string | null }[]);
      setAssignmentMessage('');
      setAssignmentReady(true);
    })();
  }, [order.id, order.status, order.rider_id, order.payment_status]);

  async function handleAssignRider() {
    if (!selectedRider) return;
    setBusy(true); setAssignmentMessage('');
    const { data, error } = await getBrowserSupabase().functions.invoke('dispatch-marketplace', { body: { action: 'assign_rider', restaurant_order_id: order.id, rider_id: selectedRider } });
    if (error || data?.error || !data?.ok) setAssignmentMessage(data?.error ?? error?.message ?? 'Could not assign rider.');
    else { setAssignmentMessage('Rider assigned. Refresh orders to see the assignment.'); setAssignmentEnabled(false); }
    setBusy(false);
  }
  const status = STATUS_LABEL[order.status] ?? { label: order.status, color: 'var(--gray)' };

  async function handleAccept() {
    setBusy(true);
    await onUpdateStatus(order.id, 'preparing');
    setBusy(false);
  }

  async function handleConfirmHandover() {
    setBusy(true);
    await onUpdateStatus(order.id, 'picked_up');
    setBusy(false);
    setConfirming(false);
  }

  return (
    <div className="p-3.5 rounded-[12px]" style={{ border: '1px solid var(--line)', background: 'var(--white)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>
          Order #{order.id.slice(0, 8)}
        </p>
        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--peach)', color: status.color }}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--gray)' }}>
        <Clock className="w-3 h-3" />
        <span className="text-[11px]">
          {new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <p className="text-[11.5px] mb-2" style={{ color: 'var(--gray)' }}>
        ₦{Number(order.subtotal).toLocaleString()} · {order.delivery_address ?? 'No address on file'}
      </p>

      {['delivered', 'cancelled'].includes(order.status) && (
        <div className="mb-2">
          <span className="inline-flex rounded-full px-2 py-1 text-[10.5px] font-semibold" style={{ background: 'var(--peach)', color: 'var(--gray)' }}>Order closed · {status.label}</span>
        </div>
      )}

      {['placed', 'preparing'].includes(order.status) && (
        <div className="mb-2">
          {order.rider_id ? (
            <span className="inline-flex rounded-full px-2 py-1 text-[10.5px] font-semibold" style={{ background: 'var(--teal)', color: 'white' }}>Rider assigned</span>
          ) : order.payment_status !== 'paid' ? (
            <span className="inline-flex rounded-full px-2 py-1 text-[10.5px] font-semibold" style={{ background: 'var(--peach)', color: 'var(--red)' }}>Payment not confirmed</span>
          ) : !assignmentReady ? (
            <span className="inline-flex rounded-full px-2 py-1 text-[10.5px] font-semibold" style={{ background: 'var(--peach)', color: 'var(--gray)' }}>Checking rider availability…</span>
          ) : assignmentMessage ? (
            <span className="inline-flex rounded-full px-2 py-1 text-[10.5px] font-semibold" style={{ background: 'var(--peach)', color: 'var(--red)' }}>Rider availability error</span>
          ) : !assignmentEnabled ? (
            <span className="inline-flex rounded-full px-2 py-1 text-[10.5px] font-semibold" style={{ background: 'var(--peach)', color: 'var(--gray)' }}>Assignment disabled</span>
          ) : eligibleRiders.length > 0 ? (
            <span className="inline-flex rounded-full px-2 py-1 text-[10.5px] font-semibold" style={{ background: 'var(--green)', color: 'white' }}>Ready to assign</span>
          ) : (
            <span className="inline-flex rounded-full px-2 py-1 text-[10.5px] font-semibold" style={{ background: 'var(--peach)', color: 'var(--orange)' }}>Waiting for eligible rider</span>
          )}
        </div>
      )}

      {!order.rider_id && order.payment_status === 'paid' && ['placed', 'preparing'].includes(order.status) && (
        <div className="mt-2 mb-2 rounded-[9px] p-2.5 space-y-2" style={{ background: 'var(--peach)', border: '1px solid var(--line)' }}>
          <div>
            <p className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>Assign a delivery rider</p>
            <p className="text-[10.5px]" style={{ color: 'var(--gray)' }}>Choose an eligible online rider for this order before handing over the food.</p>
          </div>
          {!assignmentReady && <p role="status" className="text-xs" style={{ color: 'var(--gray)' }}>Loading available riders…</p>}
          {assignmentReady && assignmentMessage && <p role="status" className="text-xs" style={{ color: 'var(--red)' }}>{assignmentMessage}</p>}
          {assignmentReady && !assignmentMessage && !assignmentEnabled && <p role="status" className="text-xs" style={{ color: 'var(--gray)' }}>Restaurant rider assignment is currently disabled.</p>}
          {assignmentReady && assignmentEnabled && eligibleRiders.length > 0 && (
            <div className="flex gap-2">
              <select aria-label="Select delivery rider" value={selectedRider} onChange={e => setSelectedRider(e.target.value)} className="min-w-0 flex-1 rounded-lg border p-2 text-xs" style={{ borderColor: 'var(--line)', background: 'var(--white)' }}>
                <option value="">Choose rider…</option>
                {eligibleRiders.map(r => <option key={r.id} value={r.id}>{r.name} · {r.zone ?? 'No zone'}</option>)}
              </select>
              <button onClick={() => void handleAssignRider()} disabled={!selectedRider || busy} className="rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-40" style={{ background: 'var(--orange)' }}>{busy ? 'Assigning…' : 'Assign rider'}</button>
            </div>
          )}
          {assignmentReady && assignmentEnabled && !eligibleRiders.length && !assignmentMessage && <p role="status" className="text-xs" style={{ color: 'var(--gray)' }}>No eligible online riders are available in this order’s service area. The rider must be online, approved, waiver-complete, dispatch-enabled, and in the same service zone.</p>}
        </div>
      )}

      {order.status === 'placed' && (
        <button
          onClick={handleAccept}
          disabled={busy}
          className="w-full py-2 rounded-[8px] text-[12px] font-semibold text-white disabled:opacity-40"
          style={{ background: 'var(--orange)' }}
        >
          Accept order
        </button>
      )}

      {order.status === 'preparing' && !confirming && (
        <button
          onClick={() => setConfirming(true)}
          disabled={busy}
          className="w-full py-2 rounded-[8px] text-[12px] font-semibold disabled:opacity-40"
          style={{ border: '1px solid var(--orange)', color: 'var(--orange)' }}
        >
          Rider arrived — hand over food
        </button>
      )}

      {order.status === 'preparing' && confirming && (
        <div className="p-2.5 rounded-[9px]" style={{ background: 'var(--peach)' }}>
          {order.rider ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Bike className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ink)' }} />
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{order.rider.name}</p>
                  <p className="text-[10.5px]" style={{ color: 'var(--gray)' }}>
                    {order.rider.vehicle_type ?? 'Rider'}
                    {order.rider.plate_number ? ` · ${order.rider.plate_number}` : ''}
                  </p>
                </div>
              </div>
              <p className="text-[11px] mb-2" style={{ color: 'var(--ink)' }}>
                Confirm this matches the rider in front of you before handing over the food.
              </p>
            </>
          ) : (
            <p className="text-[11px] mb-2" style={{ color: 'var(--red)' }}>
              No rider assigned to this order yet — don't hand over the food until one is.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2 rounded-[8px] text-[11.5px] font-semibold"
              style={{ border: '1px solid var(--line)', color: 'var(--gray)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmHandover}
              disabled={busy || !order.rider_id}
              className="flex-1 py-2 rounded-[8px] text-[11.5px] font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--orange)' }}
            >
              Confirm &amp; hand over
            </button>
          </div>
        </div>
      )}

      {order.status === 'picked_up' && order.rider && (
        <div className="flex items-center gap-1.5" style={{ color: 'var(--gray)' }}>
          <Bike className="w-3.5 h-3.5" />
          <span className="text-[11px]">With {order.rider.name} — out for delivery</span>
        </div>
      )}
    </div>
  );
}
