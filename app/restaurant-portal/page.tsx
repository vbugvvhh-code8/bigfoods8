'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import getBrowserSupabase from '@/lib/supabase/client';
import { resolveRestaurantEntryPath } from '@/lib/resolveRestaurantEntryPath';

/** Sends a signed-in seller to the right step (or the dashboard) based on what is saved in the database. */
export default function RestaurantPortalPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getBrowserSupabase();
    resolveRestaurantEntryPath(supabase)
      .then((path) => router.replace(path))
      .catch(() => router.replace('/restaurant-portal/login'));
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--white)' }}>
      <p className="text-[13px]" style={{ color: 'var(--gray)' }}>
        Loading your setup…
      </p>
    </div>
  );
}
