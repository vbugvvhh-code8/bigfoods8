'use client';

import useRider from '@/hooks/useRider';
import useRiderWallet from '@/hooks/useRiderWallet';
import usePricingConfig from '@/hooks/usePricingConfig';

const PAYOUT_STATUS_COLOR: Record<string, string> = {
  pending: 'var(--orange)', processing: 'var(--orange)', paid: 'var(--green)', rejected: 'var(--red)',
};

export default function RiderWalletPage() {
  const { rider } = useRider();
  const { transactions, payouts, balance, hasOpenRequest, loading, error, requesting, requestPayout } = useRiderWallet(rider?.id);
  const { prices } = usePricingConfig(['rider_payout_minimum']);
  const minimum = prices.rider_payout_minimum ?? 0;
  const canWithdraw = balance >= minimum && !hasOpenRequest;

  return (
    <>
      <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--ink)', color: 'white' }}>
        <p className="text-[10.5px] uppercase tracking-wide mb-1" style={{ color: '#B8B0A8' }}>Available balance</p>
        <p className="text-[26px] font-bold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>₦{balance.toLocaleString()}</p>
        <button
          onClick={requestPayout}
          disabled={!canWithdraw || requesting}
          className="w-full py-2.5 rounded-[9px] text-[12.5px] font-semibold disabled:opacity-40"
          style={{ background: 'var(--orange)', color: 'white' }}
        >
          {requesting ? '…' : hasOpenRequest ? 'Withdrawal already pending' : `Withdraw (min ₦${minimum.toLocaleString()})`}
        </button>
      </div>

      {error && <p className="text-[11.5px] mb-3" style={{ color: 'var(--red)' }}>{error}</p>}

      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--gray)' }}>Payout history</p>
      {payouts.length === 0 && !loading && (
        <p className="text-[12px] mb-4" style={{ color: 'var(--gray)' }}>No withdrawals yet.</p>
      )}
      <div className="mb-5">
        {payouts.map((p) => (
          <div key={p.id} className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid var(--line)' }}>
            <div>
              <p className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>₦{Number(p.amount).toLocaleString()}</p>
              <p className="text-[10.5px]" style={{ color: 'var(--gray)' }}>{p.requested_at ? new Date(p.requested_at).toLocaleDateString() : ''}</p>
            </div>
            <span className="text-[10.5px] font-semibold uppercase" style={{ color: PAYOUT_STATUS_COLOR[p.status] ?? 'var(--gray)' }}>{p.status}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--gray)' }}>Recent activity</p>
      {transactions.length === 0 && !loading && (
        <p className="text-[12px]" style={{ color: 'var(--gray)' }}>No deliveries completed yet.</p>
      )}
      {transactions.slice(0, 10).map((t) => {
        const isPenalty = t.type === 'cancellation_penalty';
        return (
          <div key={t.id} className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid var(--line)' }}>
            <div>
              <p className="text-[12px]" style={{ color: 'var(--gray)' }}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}</p>
              {isPenalty && <p className="text-[10.5px]" style={{ color: 'var(--red)' }}>Cancellation penalty</p>}
            </div>
            <p className="text-[12.5px] font-medium" style={{ color: isPenalty ? 'var(--red)' : 'var(--ink)' }}>
              {Number(t.amount) >= 0 ? '+' : ''}₦{Number(t.amount).toLocaleString()}
            </p>
          </div>
        );
      })}
    </>
  );
}
