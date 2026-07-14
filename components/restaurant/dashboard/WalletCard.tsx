'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import useWallet from '@/hooks/useWallet';

interface WalletCardProps {
  restaurantId: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  paid: 'Paid',
  rejected: 'Rejected',
};

export default function WalletCard({ restaurantId }: WalletCardProps) {
  const { payouts, estimatedBalance, loading, error, requestPayout } = useWallet(restaurantId);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hasUnpaidRequest = payouts.some((p) => p.status === 'pending' || p.status === 'processing');

  async function handleRequest() {
    const value = Number(amount);
    if (!value || value <= 0) return;
    setSubmitting(true);
    const ok = await requestPayout(value);
    setSubmitting(false);
    if (ok) setAmount('');
  }

  if (loading) {
    return (
      <p className="text-[12.5px] py-4 text-center" style={{ color: 'var(--gray)' }}>
        Loading wallet…
      </p>
    );
  }

  return (
    <div>
      <div className="p-4 rounded-[12px] mb-4" style={{ background: 'var(--peach)' }}>
        <p className="text-[11.5px] mb-1" style={{ color: 'var(--gray)' }}>Estimated available balance</p>
        <p className="text-[22px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          ₦{estimatedBalance?.toLocaleString() ?? 0}
        </p>
        <p className="text-[10.5px] mt-1" style={{ color: 'var(--gray)' }}>
          Estimate based on delivered orders — confirm this matches the real payout formula.
        </p>
      </div>

      <div className="mb-4">
        <div className="flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder="Amount (₦)"
            inputMode="numeric"
            disabled={hasUnpaidRequest}
            className="flex-1 px-3 py-2.5 rounded-[9px] text-[13px] outline-none disabled:opacity-50"
            style={{ border: '1px solid var(--line)' }}
          />
          <button
            onClick={handleRequest}
            disabled={hasUnpaidRequest || submitting || !amount}
            className="px-4 rounded-[9px] text-[12.5px] font-semibold text-white disabled:opacity-40 flex items-center gap-1.5"
            style={{ background: 'var(--orange)' }}
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Withdraw
          </button>
        </div>
        {hasUnpaidRequest && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--gray)' }}>
            You have a withdrawal request awaiting payment.
          </p>
        )}
        {error && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--red)' }}>
            {error}
          </p>
        )}
      </div>

      <p className="text-[11.5px] font-medium mb-2" style={{ color: 'var(--gray)' }}>Recent requests</p>
      {payouts.length === 0 ? (
        <p className="text-[12px]" style={{ color: 'var(--gray)' }}>No withdrawal requests yet.</p>
      ) : (
        <div className="space-y-2">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2.5 rounded-[8px]" style={{ border: '1px solid var(--line)' }}>
              <span className="text-[12.5px]">₦{Number(p.amount).toLocaleString()}</span>
              <span className="text-[11px] font-medium" style={{ color: 'var(--gray)' }}>
                {STATUS_LABEL[p.status ?? 'pending']}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
