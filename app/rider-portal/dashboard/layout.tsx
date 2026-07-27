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

  // approval_status is admin-controlled (admin-review-application) or set by
  // rider-cancel-delivery on hitting the strike limit -- a paid rider isn't
  // necessarily approved, and an approved rider can later become suspended.
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
              : "We're reviewing your details. This usually doesn't take long."}
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
