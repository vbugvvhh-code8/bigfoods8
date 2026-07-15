'use client';

import { useRouter } from 'next/navigation';
import PaymentStep from '@/components/rider/onboarding/PaymentStep';
import useRiderOnboardingSession from '@/hooks/useRiderOnboardingSession';

export default function RiderPaymentPage() {
  const router = useRouter();
  const { draft, hydrated } = useRiderOnboardingSession();

  if (!hydrated) return null;

  return <PaymentStep draft={draft} onBack={() => router.push('/rider-portal/onboarding/location')} />;
}
