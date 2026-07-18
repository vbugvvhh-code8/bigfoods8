'use client';

import { User, Store, MapPin, Truck, UtensilsCrossed, CreditCard } from 'lucide-react';
import { ONBOARDING_STEPS, OnboardingStep } from '@/hooks/useOnboardingSession';

interface ProgressTicketProps {
  currentStep: OnboardingStep;
}

const STEP_ICONS: Record<OnboardingStep, typeof User> = {
  'seller-info': User,
  'restaurant-info': Store,
  location: MapPin,
  'delivery-zone': Truck,
  menu: UtensilsCrossed,
  payment: CreditCard,
};

export default function ProgressTicket({ currentStep }: ProgressTicketProps) {
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div
      className="rounded-t-[10px] px-4 sm:px-5 pt-4 pb-3 relative"
      style={{ background: 'var(--white)', border: '1px solid var(--line)', borderBottom: 'none' }}
    >
      <div className="flex">
        {ONBOARDING_STEPS.map((s, i) => {
          const Icon = STEP_ICONS[s.id];
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <div key={s.id} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className="rounded-full flex items-center justify-center transition-all flex-shrink-0"
                style={{
                  width: 24,
                  height: 24,
                  background: done ? 'var(--orange)' : current ? 'var(--white)' : 'var(--peach)',
                  border: done ? '1px solid var(--orange)' : current ? '2px solid var(--orange)' : '1px solid var(--line)',
                }}
              >
                <Icon
                  className="w-3 h-3"
                  style={{ color: done ? 'var(--white)' : current ? 'var(--orange)' : 'var(--gray)' }}
                  strokeWidth={2.5}
                />
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
          );
        })}
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
