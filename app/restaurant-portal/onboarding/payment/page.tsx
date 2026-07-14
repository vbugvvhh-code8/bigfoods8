'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import PaymentStep from '@/components/restaurant/onboarding/PaymentStep';
import usePaystackPayment from '@/hooks/usePaystackPayment';
import usePaymentStatus from '@/hooks/usePaymentStatus';
import useRestaurant from '@/hooks/useRestaurant';

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { restaurant, loading: restaurantLoading } = useRestaurant();
  const { verifyPayment } = usePaystackPayment();
  const { verificationPaid, refresh: refreshPaymentStatus } = usePaymentStatus(restaurant?.id);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const reference = searchParams.get('reference');

  useEffect(() => {
    if (!reference) return;
    setVerifying(true);
    verifyPayment(reference).then((result) => {
      setVerifying(false);
      if (!result.success) {
        setVerifyError('That payment could not be confirmed. You can try again below.');
      } else {
        refreshPaymentStatus();
      }
      router.replace('/restaurant-portal/onboarding/payment');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  if (restaurantLoading || verifying) {
    return (
      <div className="py-10 flex flex-col items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--orange)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--gray)' }}>
          {verifying ? 'Confirming your payment…' : 'Loading…'}
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

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        Step 5 of 5
      </p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Almost there
      </h2>
      <p className="text-[12.5px] mb-5" style={{ color: 'var(--gray)' }}>
        One required payment, one optional one.
      </p>

      {verifyError && (
        <p className="text-[11.5px] mb-3" style={{ color: 'var(--red)' }}>
          {verifyError}
        </p>
      )}

      <PaymentStep restaurantId={restaurant.id} />

      <button
        onClick={() => router.push('/restaurant-portal/dashboard')}
        disabled={!verificationPaid}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white mt-5 disabled:opacity-40"
        style={{ background: 'var(--orange)' }}
      >
        Continue to dashboard
      </button>
      {!verificationPaid && (
        <p className="text-[11px] text-center mt-2" style={{ color: 'var(--gray)' }}>
          Pay the verification fee to continue.
        </p>
      )}
    </>
  );
}
