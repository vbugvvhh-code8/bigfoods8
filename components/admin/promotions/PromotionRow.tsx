'use client';

import usePromotionAction from '@/hooks/usePromotionAction';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#FFF1E6', fg: '#E85D00' },
  active: { bg: '#E4F5EB', fg: '#1E9E5A' },
  expired: { bg: '#F0E1D2', fg: '#8C8681' },
  rejected: { bg: '#FBEAEA', fg: '#C1453A' },
};

export default function PromotionRow({ promotion }: any) {
  const { reviewPromotion, loadingIds } = usePromotionAction();
  const isLoading = loadingIds.includes(promotion.id);
  const color = STATUS_COLORS[promotion.status] ?? STATUS_COLORS.pending;

  async function handle(action: 'approve' | 'reject') {
    try {
      await reviewPromotion(promotion.id, action);
    } catch (err: any) {
      alert(err?.message || 'Failed to update promotion');
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
      <div>
        <div className="font-medium text-[13px]">{promotion.restaurant_name ?? 'Unknown restaurant'}</div>
        <div className="text-[11px]" style={{ color: 'var(--gray)' }}>
          {promotion.restaurant_zone ?? '—'} · ₦{Number(promotion.amount_paid).toLocaleString()}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: color.bg, color: color.fg }}>
          {promotion.status}
        </span>
        {promotion.status === 'pending' && (
          <div className="flex gap-1.5">
            <button onClick={() => handle('reject')} disabled={isLoading} className="px-2.5 py-1 rounded-md text-[12px]" style={{ border: '1px solid var(--line)', opacity: isLoading ? 0.6 : 1 }}>
              Reject
            </button>
            <button onClick={() => handle('approve')} disabled={isLoading} className="px-2.5 py-1 rounded-md text-[12px] text-white" style={{ background: 'var(--orange)', opacity: isLoading ? 0.6 : 1 }}>
              {isLoading ? '…' : 'Approve'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
