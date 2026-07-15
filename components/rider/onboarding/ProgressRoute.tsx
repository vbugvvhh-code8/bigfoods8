'use client';

import { RIDER_ONBOARDING_STEPS, RiderOnboardingStep } from '@/hooks/useRiderOnboardingSession';

interface ProgressRouteProps {
  currentStep: RiderOnboardingStep;
}

export default function ProgressRoute({ currentStep }: ProgressRouteProps) {
  const currentIndex = RIDER_ONBOARDING_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="relative px-1.5 py-5 pb-6">
      <div
        className="absolute left-7 right-7 top-[34px] h-0"
        style={{ borderTop: '2px dashed var(--line)' }}
      />
      <div className="flex justify-between relative z-10">
        {RIDER_ONBOARDING_STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-col items-center gap-1.5 flex-1">
            <div
              className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
              style={{
                background: i < currentIndex ? 'var(--orange)' : 'var(--white)',
                border:
                  i < currentIndex
                    ? '2px solid var(--orange)'
                    : i === currentIndex
                    ? '2px solid var(--orange)'
                    : '2px solid var(--line)',
                color: i < currentIndex ? 'white' : i === currentIndex ? 'var(--orange)' : 'var(--gray)',
              }}
            >
              {i < currentIndex ? '✓' : i + 1}
            </div>
            <span
              className="text-[10px] uppercase tracking-wide"
              style={{
                color: i <= currentIndex ? 'var(--ink)' : 'var(--gray)',
                fontWeight: i <= currentIndex ? 500 : 400,
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
