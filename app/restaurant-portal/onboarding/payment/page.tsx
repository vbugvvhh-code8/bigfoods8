'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';
import usePaystackPayment from '@/hooks/usePaystackPayment';
import usePaymentStatus from '@/hooks/usePaymentStatus';
import useRestaurant from '@/hooks/useRestaurant';
import usePricingConfig from '@/hooks/usePricingConfig';
import useHasMenuItem from '@/hooks/useHasMenuItem';

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { restaurant, loading: restaurantLoading } = useRestaurant();

  // Using your custom hooks
  const { status: paymentStatus, error: hookError, startPayment, verifyPayment } = usePaystackPayment();
  const { promotionPaid, refresh: refreshPaymentStatus } = usePaymentStatus(restaurant?.id);
  const { prices, loading: pricesLoading } = usePricingConfig(['promotion_fee_discounted', 'promotion_fee_normal']);
  const hasMenuItem = useHasMenuItem(restaurant?.id);

  const [selectedTier, setSelectedTier] = useState<'2_weeks' | '1_month'>('1_month');
  const reference = searchParams.get('reference');

  // 1. Handle returning from Paystack redirect
  useEffect(() => {
    if (!reference) return;

    verifyPayment(reference).then((result) => {
      if (result.success) {
        refreshPaymentStatus();
      }
      // Remove reference from URL so we don't re-verify on page refresh
      router.replace('/restaurant-portal/onboarding/payment');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  // 2. Auto-route once the promotion is marked as paid in your transactions table
  useEffect(() => {
    if (promotionPaid) {
      router.replace('/restaurant-portal/dashboard');
    }
  }, [promotionPaid, router]);

  const handlePayment = () => {
    // Pass 'promotion' as the type, and send the selected tier to your edge function
    startPayment('promotion', { plan: selectedTier });
  };

  const isProcessing = paymentStatus === 'starting' || paymentStatus === 'redirecting' || paymentStatus === 'verifying';

  if (restaurantLoading || pricesLoading || paymentStatus === 'verifying') {
    return (
      <div className="py-10 flex flex-col items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--orange)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--gray)' }}>
          {paymentStatus === 'verifying' ? 'Confirming your payment...' : 'Loading...'}
        </p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Complete the earlier onboarding steps first.
      </p>
    );
  }

  const monthPrice = prices.promotion_fee_normal;
  const twoWeekPrice = prices.promotion_fee_discounted;
  const selectedPrice = selectedTier === '1_month' ? monthPrice : twoWeekPrice;

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        Step 5 of 5
      </p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Launch & Promote
      </h2>
      <p className="text-[12.5px] mb-5" style={{ color: 'var(--gray)' }}>
        Everybody starts with a promotion. This is how you get your first set of customers and keep them returning.
      </p>

      {hookError && (
        <p className="text-[11.5px] mb-3 p-3 rounded-[9px]" style={{ background: '#FEF2F2', color: 'var(--red)' }}>
          {hookError}
        </p>
      )}

      {!hasMenuItem && (
        <p className="text-[11.5px] mb-3 p-3 rounded-[9px]" style={{ background: 'var(--peach)', color: 'var(--gray)' }}>
          Add at least one menu item before you can activate a promotion.
        </p>
      )}

      {/* The Hook Panel */}
      <div className="mb-6 p-4 rounded-[12px]" style={{ background: 'var(--peach)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--orange)' }} />
          <p className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--orange)' }}>
            Local Market Data
          </p>
        </div>
        <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--ink)' }}>
          Average orders daily from your location: 91 - 314
        </p>
        <p className="text-[12px]" style={{ color: 'var(--gray)' }}>
          Does your food have what it takes to get over 10% of these eating your food daily?
        </p>
      </div>

      {/* Promotion Tiers */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => setSelectedTier('1_month')}
          className="w-full text-left p-4 rounded-[12px] flex items-center justify-between transition-all"
          style={{
            border: selectedTier === '1_month' ? '2px solid var(--orange)' : '1px solid var(--line)',
            background: selectedTier === '1_month' ? '#FFF9F5' : 'var(--white)',
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>1 Month Promotion</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black text-white">
                WELCOME OFFER
              </span>
            </div>
            <p className="text-[12px]" style={{ color: 'var(--gray)' }}>Full coverage for maximum returning customers.</p>
          </div>
          <div className="text-right">
            <p className="text-[15px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}>
              ₦{monthPrice?.toLocaleString()}
            </p>
          </div>
        </button>

        <button
          onClick={() => setSelectedTier('2_weeks')}
          className="w-full text-left p-4 rounded-[12px] flex items-center justify-between transition-all"
          style={{
            border: selectedTier === '2_weeks' ? '2px solid var(--orange)' : '1px solid var(--line)',
            background: selectedTier === '2_weeks' ? '#FFF9F5' : 'var(--white)',
          }}
        >
          <div>
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>2 Weeks Promotion</p>
            <p className="text-[12px]" style={{ color: 'var(--gray)' }}>A quick boost to get your first orders rolling.</p>
          </div>
          <div className="text-right">
            <p className="text-[15px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}>
              ₦{twoWeekPrice?.toLocaleString()}
            </p>
          </div>
        </button>
      </div>

      <button
        onClick={handlePayment}
        disabled={isProcessing || !hasMenuItem}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
        style={{ background: 'var(--ink)' }}
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {paymentStatus === 'redirecting'
          ? 'Redirecting to Paystack...'
          : `Select & Pay ₦${selectedPrice?.toLocaleString() ?? ''}`}
      </button>

      <p className="text-[11px] text-center mt-3" style={{ color: 'var(--gray)' }}>
        Secure payment via Paystack. You will be automatically routed to your dashboard upon success.
      </p>
    </>
  );
}
