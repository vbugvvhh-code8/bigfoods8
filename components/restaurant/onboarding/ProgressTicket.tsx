'use client';

import { ONBOARDING_STEPS, OnboardingStep } from '@/hooks/useOnboardingSession';

interface ProgressTicketProps {
  currentStep: OnboardingStep;
}

export default function ProgressTicket({ currentStep }: ProgressTicketProps) {
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div
      className="rounded-t-[10px] px-4 sm:px-5 pt-4 pb-3 relative"
      style={{ background: 'var(--white)', border: '1px solid var(--line)', borderBottom: 'none' }}
    >
      <div className="flex">
        {ONBOARDING_STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className="rounded-full transition-all"
              style={{
                background: i < currentIndex ? 'var(--orange)' : i === currentIndex ? 'var(--white)' : 'var(--line)',
                border:
                  i < currentIndex
                    ? '1px solid var(--orange)'
                    : i === currentIndex
                    ? '2px solid var(--orange)'
                    : '1px solid var(--line)',
                width: i === currentIndex ? '9px' : '8px',
                height: i === currentIndex ? '9px' : '8px',
              }}
            />
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

      {/* Dashed tear edge with punch holes on either side */}
      <div className="mt-3.5 relative" style={{ height: 0, borderBottom: '2px dashed var(--line)' }}>
        <span
          className="absolute w-4 h-4 rounded-full"
          style={{ top: -8, left: -27, background: 'var(--white)' }}
        />
        <span
          className="absolute w-4 h-4 rounded-full"
          style={{ top: -8, right: -27, background: 'var(--white)' }}
        />
      </div>
    </div>
  );
}
