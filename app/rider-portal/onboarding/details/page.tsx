'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DetailsForm from '@/components/rider/onboarding/DetailsForm';
import useRiderOnboardingSession, { RIDER_ONBOARDING_STEPS } from '@/hooks/useRiderOnboardingSession';

export default function RiderDetailsPage() {
  const router = useRouter();
  const { draft, updateDraft, hydrated, resumeStep } = useRiderOnboardingSession();

  useEffect(() => {
    if (hydrated && resumeStep && resumeStep !== 'details') {
      const target = RIDER_ONBOARDING_STEPS.find((s) => s.id === resumeStep);
      if (target) router.replace(target.path);
    }
  }, [hydrated, resumeStep, router]);

  if (!hydrated || resumeStep !== 'details') return null;

  return (
    <DetailsForm
      draft={draft}
      updateDraft={updateDraft}
      // A full navigation makes the next step re-read the saved rider row,
      // avoiding a stale client-side onboarding step leaving the form in place.
      onContinue={() => { window.location.assign('/rider-portal/onboarding/documents'); }}
    />
  );
}
