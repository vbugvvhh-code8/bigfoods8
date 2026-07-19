'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/restaurant/dashboard/Sidebar';
import useRestaurant from '@/hooks/useRestaurant';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
    <div className="flex flex-col md:flex-row min-h-screen" style={{ background: '#F7F4F0' }}>
      <Sidebar restaurantName={restaurant.name} />
      <main className="flex-1 px-4 py-4 sm:px-7 sm:py-6 max-w-[1180px] overflow-auto w-full">{children}</main>
    </div>
  );
}
