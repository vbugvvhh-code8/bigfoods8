'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ProgressTicket from '@/components/restaurant/onboarding/ProgressTicket';
import OnboardingBrandPanel from '@/components/restaurant/onboarding/OnboardingBrandPanel';
import SafeImage from '@/components/ui/SafeImage';
import { ONBOARDING_STEPS, OnboardingStep, previousStep } from '@/hooks/useOnboardingSession';
import { CHEF_URL, LOGO_URL } from '@/lib/brandImages';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentStep =
    (ONBOARDING_STEPS.find((s) => pathname?.includes(s.id))?.id as OnboardingStep) ?? 'agreement';
  const prev = previousStep(currentStep);
  const backHref = prev?.path ?? '/restaurant';
  const wide = currentStep === 'agreement';

  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-2" style={{ background: 'var(--white)' }}>
      {/* Phone: the photo sits faded behind the page. Laptop: it moves to the right column. */}
      <SafeImage
        src={CHEF_URL}
        alt=""
        loading="eager"
        className="fixed inset-0 h-full w-full object-cover opacity-[0.12] pointer-events-none lg:hidden"
      />

      <div className="relative z-10 flex justify-center px-4 py-8 pb-16 lg:py-14">
        <div className={`w-full ${wide ? 'max-w-[640px]' : 'max-w-[440px]'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Link href={backHref} className="mr-1 p-1 -ml-1 rounded-md" style={{ color: 'var(--gray)' }} aria-label={prev ? 'Back to the previous step' : 'Back to the restaurant page'}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden"
              style={{ background: 'var(--orange)' }}
            >
              <SafeImage src={LOGO_URL} alt="" loading="eager" className="w-full h-full object-cover" />
            </div>
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

          {prev && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-[12px] font-medium mb-3 underline underline-offset-2"
              style={{ color: 'var(--gray)' }}
            >
              <ArrowLeft className="w-3 h-3" /> Back to {prev.label.toLowerCase()}
            </Link>
          )}

          <ProgressTicket currentStep={currentStep} />

          <div
            className="px-5 pt-6 pb-5 rounded-b-2xl"
            style={{ border: '1px solid var(--line)', borderTop: 'none', background: 'var(--white)' }}
          >
            {children}
          </div>
        </div>
      </div>

      <OnboardingBrandPanel />
    </div>
  );
}
