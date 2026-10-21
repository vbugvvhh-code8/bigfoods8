'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/restaurant/dashboard/Sidebar';
import useRestaurant from '@/hooks/useRestaurant';
import getBrowserSupabase from '@/lib/supabase/client';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { restaurant, loading } = useRestaurant();
  const supabase = getBrowserSupabase();
  const [paymentCheck, setPaymentCheck] = useState<'checking' | 'required' | 'paid'>('checking');

  useEffect(() => {
    let cancelled = false;
    async function checkPayment() {
      if (!restaurant) {
        if (!loading && !cancelled) setPaymentCheck('required');
        return;
      }

      // Existing legacy restaurants without the new owner-details record keep
      // their established dashboard access. New onboarding sellers must have
      // a server-confirmed successful onboarding-plan transaction.
      const { data: details, error: detailsError } = await supabase
        .from('restaurant_owner_details')
        .select('restaurant_id')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (detailsError) {
        if (!cancelled) setPaymentCheck('required');
        return;
      }
      if (!details) {
        if (!cancelled) setPaymentCheck('paid');
        return;
      }

      const { count, error: paymentError } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .eq('type', 'onboarding_plan')
        .eq('status', 'success');

      if (!cancelled) setPaymentCheck(!paymentError && !!count ? 'paid' : 'required');
    }

    if (!loading) void checkPayment();
    return () => { cancelled = true; };
  }, [restaurant?.id, loading, supabase]);

  useEffect(() => {
    if (!loading && !restaurant) router.replace('/restaurant-portal');
    if (!loading && restaurant && paymentCheck === 'required') {
      router.replace('/restaurant-portal/onboarding/payment');
    }
  }, [loading, restaurant, paymentCheck, router]);

  if (loading || !restaurant || paymentCheck === 'checking' || paymentCheck === 'required') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--white)' }}>
        <p className="text-[13px]" style={{ color: 'var(--gray)' }}>Checking account and payment…</p>
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
