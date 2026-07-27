'use client';

import { User, FileText, MapPin, ShieldCheck } from 'lucide-react';
import { RIDER_ONBOARDING_STEPS, RiderOnboardingStep } from '@/hooks/useRiderOnboardingSession';

interface ProgressRouteProps {
  currentStep: RiderOnboardingStep;
}

const STEP_ICONS: Record<RiderOnboardingStep, typeof User> = {
  details: User,
  documents: FileText,
  location: MapPin,
  payment: ShieldCheck,
};

export default function ProgressRoute({ currentStep }: ProgressRouteProps) {
  const currentIndex = RIDER_ONBOARDING_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="relative px-1.5 py-5 pb-6">
      <div className="absolute left-7 right-7 top-[34px] h-0" style={{ borderTop: '2px dashed var(--line)' }} />
      <div className="flex justify-between relative z-10">
        {RIDER_ONBOARDING_STEPS.map((s, i) => {
          const Icon = STEP_ICONS[s.id];
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <div key={s.id} className="flex-1 flex justify-center">
              <div
                className="w-[26px] h-[26px] rounded-full flex items-center justify-center transition-all"
                style={{
                  background: done ? 'var(--orange)' : 'var(--white)',
                  border: done || current ? '2px solid var(--orange)' : '2px solid var(--line)',
                }}
              >
                <Icon
                  className="w-3.5 h-3.5"
                  style={{ color: done ? 'white' : current ? 'var(--orange)' : 'var(--gray)' }}
                  strokeWidth={2.5}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
