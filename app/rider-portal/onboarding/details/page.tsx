'use client';

import { useRouter } from 'next/navigation';
import DetailsForm from '@/components/rider/onboarding/DetailsForm';
import useRiderOnboardingSession from '@/hooks/useRiderOnboardingSession';

export default function RiderDetailsPage() {
  const router = useRouter();
  const { draft, updateDraft, hydrated } = useRiderOnboardingSession();

  if (!hydrated) return null;

  return (
    <DetailsForm
      draft={draft}
      updateDraft={updateDraft}
      onContinue={() => router.push('/rider-portal/onboarding/location')}
    />
  );
}
