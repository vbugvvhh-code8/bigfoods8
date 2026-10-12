'use client';

import PaymentStep from '@/components/restaurant/onboarding/PaymentStep';


export default function RestaurantPaymentPage() {
  return (
    <>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Choose your plan
      </h2>
      <PaymentStep />
    </>
  );
}
