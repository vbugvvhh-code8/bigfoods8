'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ProgressTicket from '@/components/restaurant/onboarding/ProgressTicket';
import OnboardingBrandPanel from '@/components/restaurant/onboarding/OnboardingBrandPanel';
import { ONBOARDING_STEPS, OnboardingStep } from '@/hooks/useOnboardingSession';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentStep =
    (ONBOARDING_STEPS.find((s) => pathname?.includes(s.id))?.id as OnboardingStep) ?? 'seller-info';

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--white)' }}>
      <div className="flex-1 flex justify-center px-4 py-8 pb-16 lg:py-14">
        <div className="w-full max-w-[380px] sm:max-w-[440px] lg:max-w-[440px]">
          <div className="flex items-center gap-2 mb-6">
            <Link href="/" className="mr-1" style={{ color: 'var(--gray)' }}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-5 h-5 rounded-md flex-shrink-0" style={{ background: 'var(--orange)' }} />
            <span
              className="font-semibold text-[15px] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              BigFoods
            </span>
            <span className="text-[11px] ml-auto" style={{ color: 'var(--gray)' }}>
              Restaurant Portal
            </span>
          </div>

          <ProgressTicket currentStep={currentStep} />

          <div className="px-5 pt-6 pb-5 rounded-b-2xl" style={{ border: '1px solid var(--line)', borderTop: 'none' }}>
            {children}
          </div>
        </div>
      </div>

      <OnboardingBrandPanel />
    </div>
  );
}
