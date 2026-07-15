'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useRider from '@/hooks/useRider';
import useRiderActiveOrder from '@/hooks/useRiderActiveOrder';
import useRiderWallet from '@/hooks/useRiderWallet';

const STATUS_LABEL: Record<string, string> = {
  placed: 'New order — awaiting pickup',
  preparing: 'Restaurant is preparing',
  picked_up: 'On the way to drop-off',
};

export default function RiderDashboardPage() {
  const { rider, setOnline } = useRider();
  const { order, loading: orderLoading } = useRiderActiveOrder(rider?.id);
  const { transactions } = useRiderWallet(rider?.id);
  const [toggling, setToggling] = useState(false);

  const online = rider?.status === 'online';
  const missingZone = !rider?.zone;

  const todayEarnings = useMemo(() => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    return transactions
      .filter((t) => t.created_at && new Date(t.created_at) >= startOfDay)
      .reduce((s, t) => s + Number(t.amount), 0);
  }, [transactions]);

  async function handleToggle() {
    setToggling(true);
    await setOnline(!online);
    setToggling(false);
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-2xl p-4 mb-4" style={{ background: 'var(--ink)', color: 'white' }}>
        <div>
          <p className="text-[11px] uppercase tracking-wide mb-0.5" style={{ color: '#B8B0A8' }}>Status</p>
          <p className="text-[16px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {online ? "You're online" : "You're offline"}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="px-4 py-2 rounded-full text-[12.5px] font-semibold disabled:opacity-50"
          style={{ background: online ? 'var(--red)' : 'var(--orange)', color: 'white' }}
        >
          {toggling ? '…' : online ? 'Go offline' : 'Go online'}
        </button>
      </div>

      {missingZone && (
        <div className="rounded-[10px] p-3 mb-4 text-[11.5px]" style={{ background: 'var(--peach)', color: '#6E5A46' }}>
          Your zone isn&apos;t set yet, so orders can&apos;t be matched to you.{' '}
          <Link href="/rider-portal/dashboard/profile" className="font-semibold underline">Set it in your profile</Link>.
        </div>
      )}

      {orderLoading ? null : order ? (
        <Link
          href={`/rider-portal/dashboard/delivery/${order.id}`}
          className="block rounded-2xl p-4 mb-4"
          style={{ border: '1px solid var(--line)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--orange)' }}>
            Active delivery
          </p>
          <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>
            {STATUS_LABEL[order.status] ?? order.status}
          </p>
          <p className="text-[12px]" style={{ color: 'var(--gray)' }}>{order.delivery_address ?? 'Address not set'}</p>
        </Link>
      ) : (
        <div className="rounded-2xl p-5 mb-4 text-center" style={{ border: '1px dashed var(--line)' }}>
          <p className="text-[12.5px]" style={{ color: 'var(--gray)' }}>
            {online ? 'Waiting for an order to come in…' : 'Go online to start receiving orders.'}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1 rounded-[10px] p-3.5" style={{ border: '1px solid var(--line)' }}>
          <p className="text-[10.5px] uppercase tracking-wide mb-1" style={{ color: 'var(--gray)' }}>Today&apos;s earnings</p>
          <p className="text-[18px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>₦{todayEarnings.toLocaleString()}</p>
        </div>
        <div className="flex-1 rounded-[10px] p-3.5" style={{ border: '1px solid var(--line)' }}>
          <p className="text-[10.5px] uppercase tracking-wide mb-1" style={{ color: 'var(--gray)' }}>Vehicle</p>
          <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--ink)' }}>{rider?.vehicle_type ?? '—'}</p>
        </div>
      </div>
    </>
  );
}
