'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PaymentStep from '@/components/rider/onboarding/PaymentStep';
import useRiderOnboardingSession, { RIDER_ONBOARDING_STEPS } from '@/hooks/useRiderOnboardingSession';

export default function RiderPaymentPage() {
  const router = useRouter();
  const { draft, hydrated, resumeStep } = useRiderOnboardingSession();

  useEffect(() => {
    if (hydrated && resumeStep && resumeStep !== 'payment') {
      const target = RIDER_ONBOARDING_STEPS.find((s) => s.id === resumeStep);
      if (target) router.replace(target.path);
    }
  }, [hydrated, resumeStep, router]);

  if (!hydrated || resumeStep !== 'payment') return null;

  return <PaymentStep draft={draft} onBack={() => router.push('/rider-portal/onboarding/location')} />;
}
