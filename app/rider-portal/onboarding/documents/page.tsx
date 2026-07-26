'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DocumentsForm from '@/components/rider/onboarding/DocumentsForm';
import useRiderOnboardingSession, { RIDER_ONBOARDING_STEPS } from '@/hooks/useRiderOnboardingSession';

export default function RiderDocumentsPage() {
  const router = useRouter();
  const { draft, updateDraft, hydrated, resumeStep } = useRiderOnboardingSession();

  // If the server says this rider hasn't finished an earlier step yet (or has
  // already finished this one), send them to where they actually are instead
  // of letting them sit on a step out of order.
  useEffect(() => {
    if (hydrated && resumeStep && resumeStep !== 'documents') {
      const target = RIDER_ONBOARDING_STEPS.find((s) => s.id === resumeStep);
      if (target) router.replace(target.path);
    }
  }, [hydrated, resumeStep, router]);

  if (!hydrated || resumeStep !== 'documents') return null;

  return (
    <DocumentsForm
      draft={draft}
      updateDraft={updateDraft}
      onContinue={() => router.push('/rider-portal/onboarding/location')}
      onBack={() => router.push('/rider-portal/onboarding/details')}
    />
  );
}
