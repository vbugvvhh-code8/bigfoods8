'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useRider from '@/hooks/useRider';

const TABS = [
  { label: 'Today', path: '/rider-portal/dashboard' },
  { label: 'Wallet', path: '/rider-portal/dashboard/wallet' },
  { label: 'Profile', path: '/rider-portal/dashboard/profile' },
];

export default function RiderDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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
  // rider-cancel-delivery on hitting the strike limit — a paid rider isn't
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
    <div className="min-h-screen" style={{ background: 'var(--white)' }}>
      <div className="max-w-[420px] mx-auto px-4 pt-6 pb-16">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-5 h-5 rounded-md" style={{ background: 'var(--orange)' }} />
          <span className="font-semibold text-[15px] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            BigFoods
          </span>
          <span className="text-[11px] ml-auto" style={{ color: 'var(--gray)' }}>Rider Dashboard</span>
        </div>

        <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--line)' }}>
          {TABS.map((tab) => {
            const active = pathname === tab.path;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className="px-3 py-2.5 text-[12.5px] font-medium whitespace-nowrap"
                style={{ color: active ? 'var(--ink)' : 'var(--gray)', borderBottom: active ? '2px solid var(--orange)' : '2px solid transparent' }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
