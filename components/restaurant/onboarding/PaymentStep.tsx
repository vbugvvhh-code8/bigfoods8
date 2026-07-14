'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import usePricingConfig from '@/hooks/usePricingConfig';
import usePaystackPayment from '@/hooks/usePaystackPayment';
import usePaymentStatus from '@/hooks/usePaymentStatus';
import useHasMenuItem from '@/hooks/useHasMenuItem';

interface PaymentStepProps {
  restaurantId: string;
}

export default function PaymentStep({ restaurantId }: PaymentStepProps) {
  const { prices, loading: pricesLoading } = usePricingConfig([
    'verification_fee',
    'promotion_fee_discounted',
    'promotion_fee_normal',
  ]);
  const { verificationPaid, promotionPaid, loading: statusLoading } = usePaymentStatus(restaurantId);
  const hasMenuItem = useHasMenuItem(restaurantId);
  const { status, error, startPayment } = usePaystackPayment();

  if (pricesLoading || statusLoading) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  const busy = status === 'starting' || status === 'redirecting';

  return (
    <>
      <div className="mb-4 p-4 rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[13.5px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Verification fee
          </p>
          <span className="text-[14px] font-semibold" style={{ color: 'var(--orange)' }}>
            ₦{prices.verification_fee?.toLocaleString()}
          </span>
        </div>
        <p className="text-[12px] mb-3" style={{ color: 'var(--gray)' }}>
          This isn't a cost you lose — it filters for serious sellers and helps keep the platform trustworthy for
          customers.
        </p>
        {verificationPaid ? (
          <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--green)' }}>
            <CheckCircle2 className="w-4 h-4" /> Paid
          </div>
        ) : (
          <button
            onClick={() => startPayment('verification_fee')}
            disabled={busy}
            className="w-full py-3 rounded-[9px] text-[13px] font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--orange)' }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Pay verification fee
          </button>
        )}
      </div>

      <div className="p-4 rounded-[12px]" style={{ border: '1px solid var(--line)', background: 'var(--peach)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[13.5px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Get featured (optional)
          </p>
          <span className="text-[14px] font-semibold" style={{ color: 'var(--orange)' }}>
            ₦{prices.promotion_fee_discounted?.toLocaleString()}
          </span>
        </div>
        <p className="text-[12px] mb-3" style={{ color: 'var(--gray)' }}>
          This normally costs ₦{prices.promotion_fee_normal?.toLocaleString()} — yours is a signup discount.
        </p>
        {promotionPaid ? (
          <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--green)' }}>
            <CheckCircle2 className="w-4 h-4" /> Paid — pending activation
          </div>
        ) : (
          <>
            <button
              onClick={() => startPayment('promotion')}
              disabled={busy || !hasMenuItem}
              className="w-full py-3 rounded-[9px] text-[13px] font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--white)', border: '1px solid var(--orange)', color: 'var(--orange)' }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Get featured
            </button>
            {!hasMenuItem && (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--gray)' }}>
                Add a menu item from your dashboard first to unlock this.
              </p>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="text-[11px] mt-3" style={{ color: 'var(--red)' }}>
          {error}
        </p>
      )}
    </>
  );
}
