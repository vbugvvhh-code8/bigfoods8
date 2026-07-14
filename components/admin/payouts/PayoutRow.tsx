'use client';

import usePayoutAction from '@/hooks/usePayoutAction';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#FFF1E6', fg: '#E85D00' },
  processing: { bg: '#FFF1E6', fg: '#E85D00' },
  paid: { bg: '#E4F5EB', fg: '#1E9E5A' },
  rejected: { bg: '#FBEAEA', fg: '#C1453A' },
};

export default function PayoutRow({ payout }: any) {
  const { processPayout, loadingIds } = usePayoutAction();
  const isLoading = loadingIds.includes(payout.id);
  const color = STATUS_COLORS[payout.status] ?? STATUS_COLORS.pending;

  async function handle(decision: 'processing' | 'paid' | 'rejected') {
    try {
      await processPayout(payout.id, decision);
    } catch (err: any) {
      alert(err?.message || 'Failed to update payout');
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
      <div>
        <div className="font-medium text-[13px]">{payout.rider_name ?? 'Unknown rider'}</div>
        <div className="text-[11px]" style={{ color: 'var(--gray)' }}>
          {payout.rider_zone ?? '—'} · Requested {new Date(payout.requested_at).toLocaleDateString()}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="font-semibold text-[14px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          ₦{Number(payout.amount).toLocaleString()}
        </span>
        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: color.bg, color: color.fg }}>
          {payout.status}
        </span>
        {payout.status === 'pending' && (
          <div className="flex gap-1.5">
            <button onClick={() => handle('rejected')} disabled={isLoading} className="px-2.5 py-1 rounded-md text-[12px]" style={{ border: '1px solid var(--line)', opacity: isLoading ? 0.6 : 1 }}>
              Reject
            </button>
            <button onClick={() => handle('paid')} disabled={isLoading} className="px-2.5 py-1 rounded-md text-[12px] text-white" style={{ background: 'var(--orange)', opacity: isLoading ? 0.6 : 1 }}>
              {isLoading ? '…' : 'Mark paid'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
