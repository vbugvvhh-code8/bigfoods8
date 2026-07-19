'use client';

import { useState } from 'react';
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
              disabled={busy || !order.rider}
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
