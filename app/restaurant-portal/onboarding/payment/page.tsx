'use client';

import PaymentStep from '@/components/restaurant/onboarding/PaymentStep';
import { stepLabel } from '@/hooks/useOnboardingSession';

export default function RestaurantPaymentPage() {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        {stepLabel('payment')}
      </p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Choose your plan
      </h2>
      <PaymentStep />
    </>
  );
}
