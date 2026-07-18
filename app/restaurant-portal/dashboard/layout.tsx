'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useRestaurant from '@/hooks/useRestaurant';

const TABS = [
  { label: 'Overview', path: '/restaurant-portal/dashboard' },
  { label: 'Menu', path: '/restaurant-portal/dashboard/menu' },
  { label: 'Profile', path: '/restaurant-portal/dashboard/profile' },
  { label: 'Wallet', path: '/restaurant-portal/dashboard/wallet' },
  { label: 'Reports', path: '/restaurant-portal/dashboard/reports' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { restaurant, loading } = useRestaurant();

  useEffect(() => {
    if (!loading && !restaurant) {
      router.replace('/restaurant-portal');
    }
  }, [loading, restaurant, router]);

  if (loading || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--white)' }}>
        <p className="text-[13px]" style={{ color: 'var(--gray)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--white)' }}>
      <div className="max-w-[520px] mx-auto px-4 pt-6 pb-16">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-5 h-5 rounded-md" style={{ background: 'var(--orange)' }} />
          <span className="font-semibold text-[15px] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            BigFoods
          </span>
          <span className="text-[11px] ml-auto" style={{ color: 'var(--gray)' }}>
            Restaurant Dashboard
          </span>
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide" style={{ borderBottom: '1px solid var(--line)' }}>
          {TABS.map((tab) => {
            const active = pathname === tab.path;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className="px-3 py-2.5 text-[12.5px] font-medium whitespace-nowrap"
                style={{
                  color: active ? 'var(--ink)' : 'var(--gray)',
                  borderBottom: active ? '2px solid var(--orange)' : '2px solid transparent',
                }}
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
