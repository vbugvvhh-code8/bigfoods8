'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/rider/dashboard/Sidebar';
import WaiverBanner from '@/components/rider/dashboard/WaiverBanner';
import useRider from '@/hooks/useRider';

export default function RiderDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { rider, loading } = useRider();

  useEffect(() => {
    if (!loading && !rider) router.replace('/rider-portal');
  }, [loading, rider, router]);

  if (loading || !rider) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--white)' }}>
        <p className="text-[13px]" style={{ color: 'var(--gray)' }}>Loading…</p>
      </div>
    );
  }

  // Payment is a separate prerequisite from approval. Never expose dashboard
  // navigation or content to a rider until Paystack verification has marked the fee paid.
  if (!rider.verification_fee_paid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--white)' }}>
        <div className="max-w-[340px] text-center">
          <h2 className="text-[18px] font-semibold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Complete your verification payment
          </h2>
          <p className="text-[12.5px] mb-4" style={{ color: 'var(--gray)' }}>
            Your rider dashboard will remain locked until your verification payment is confirmed.
          </p>
          <button
            onClick={() => router.replace('/rider-portal/onboarding/payment')}
            className="px-4 py-2 rounded-md bg-[var(--orange)] text-white text-[13px] font-medium"
          >
            Continue to payment
          </button>
        </div>
      </div>
    );
  }

  // A paid rider is still not allowed into the dashboard until an admin approves.
  if (rider.approval_status !== 'approved') {
    const rejected = rider.approval_status === 'rejected';
    const suspended = rider.approval_status === 'suspended';
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--white)' }}>
        <div className="max-w-[320px] text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-semibold mx-auto mb-4"
            style={{ background: rejected || suspended ? 'var(--red)' : 'var(--orange)' }}
          >
            {rejected || suspended ? '✕' : '…'}
          </div>
          <h2 className="text-[18px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {suspended ? 'Account suspended' : rejected ? 'Application not approved' : 'Application under review'}
          </h2>
          <p className="text-[12.5px]" style={{ color: 'var(--gray)' }}>
            {suspended
              ? 'Too many cancelled deliveries. Contact support if you think this is a mistake.'
              : rejected
              ? "We couldn't approve your rider application this time."
              : "Your payment is confirmed. We're reviewing your details before enabling your dashboard."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen" style={{ background: '#F7F4F0' }}>
      <Sidebar riderName={rider.name} />
      <main className="flex-1 px-4 py-4 sm:px-7 sm:py-6 max-w-[1180px] overflow-auto w-full">
        {!rider.waiver_completed && !pathname?.startsWith('/rider-portal/dashboard/waiver') && <WaiverBanner />}
        {children}
      </main>
    </div>
  );
}
