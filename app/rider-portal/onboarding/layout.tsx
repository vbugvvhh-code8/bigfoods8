'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ProgressRoute from '@/components/rider/onboarding/ProgressRoute';
import { RIDER_ONBOARDING_STEPS, RiderOnboardingStep } from '@/hooks/useRiderOnboardingSession';

export default function RiderOnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentStep =
    (RIDER_ONBOARDING_STEPS.find((s) => pathname?.includes(s.id))?.id as RiderOnboardingStep) ?? 'details';

  return (
    <div className="min-h-screen flex justify-center px-4 py-8 pb-16" style={{ background: 'var(--white)' }}>
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/rider-portal" className="mr-1" style={{ color: 'var(--gray)' }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-5 h-5 rounded-md flex-shrink-0" style={{ background: 'var(--orange)' }} />
          <span className="font-semibold text-[15px] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            BigFoods
          </span>
          <span className="text-[11px] ml-auto" style={{ color: 'var(--gray)' }}>
            Rider Portal
          </span>
        </div>

        <ProgressRoute currentStep={currentStep} />

        <div className="px-5 pt-6 pb-5 rounded-2xl" style={{ border: '1px solid var(--line)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
