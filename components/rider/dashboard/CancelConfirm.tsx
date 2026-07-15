'use client';

interface CancelConfirmProps {
  showPenalty: boolean;
  penaltyPct: number | undefined;
  busy: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function CancelConfirm({ showPenalty, penaltyPct, busy, onConfirm, onDismiss }: CancelConfirmProps) {
  return (
    <div className="rounded-[10px] p-3.5 mt-3" style={{ background: 'var(--peach)' }}>
      <p className="text-[11.5px] mb-3" style={{ color: '#6E5A46', lineHeight: 1.5 }}>
        This counts as a strike against your account.
        {showPenalty && ` You've already picked up this order, so a ${penaltyPct ?? '…'}% cancellation penalty on the delivery fee will also be deducted from your wallet.`}
      </p>
      <button onClick={onConfirm} disabled={busy}
        className="w-full py-2.5 rounded-[9px] text-[12.5px] font-semibold text-white mb-2 disabled:opacity-40"
        style={{ background: 'var(--red)' }}>
        {busy ? '…' : 'Yes, cancel this delivery'}
      </button>
      <button onClick={onDismiss} className="w-full py-2 text-[12px]" style={{ color: 'var(--gray)', background: 'none', border: 'none' }}>
        Never mind
      </button>
    </div>
  );
}
