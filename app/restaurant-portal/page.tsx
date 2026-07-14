'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSession from '@/hooks/useSession';
import useRestaurant from '@/hooks/useRestaurant';
import usePaymentStatus from '@/hooks/usePaymentStatus';
import useOnboardingSession from '@/hooks/useOnboardingSession';

/**
 * Decides where to send the seller. Once a real restaurant row exists
 * (from Step 2 onward), that row is the source of truth for resuming —
 * not the local draft, which wouldn't survive a different device/browser.
 * Step 1 (before any restaurant row exists) still relies on the local draft
 * since there's nothing server-side to check yet at that point.
 */
export default function RestaurantPortalPage() {
  const router = useRouter();
  const { loading: sessionLoading } = useSession();
  const { restaurant, loading: restaurantLoading } = useRestaurant();
  const { verificationPaid, loading: paymentLoading } = usePaymentStatus(restaurant?.id);
  const { draft, hydrated } = useOnboardingSession();

  useEffect(() => {
    if (sessionLoading || restaurantLoading || !hydrated) return;

    if (!restaurant) {
      // No restaurant row yet — resume from wherever the local Step 1 draft left off.
      router.replace(
        draft.emailVerified
          ? '/restaurant-portal/onboarding/restaurant-info'
          : '/restaurant-portal/onboarding/seller-info'
      );
      return;
    }

    if (!restaurant.latitude || !restaurant.longitude) {
      router.replace('/restaurant-portal/onboarding/location');
      return;
    }

    if (!restaurant.delivery_radius_km) {
      router.replace('/restaurant-portal/onboarding/delivery-zone');
      return;
    }

    if (paymentLoading) return;

    if (verificationPaid) {
      router.replace('/restaurant-portal/dashboard');
    } else {
      router.replace('/restaurant-portal/onboarding/payment');
    }
  }, [sessionLoading, restaurantLoading, paymentLoading, hydrated, restaurant, verificationPaid, draft, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--white)' }}>
      <p className="text-[13px]" style={{ color: 'var(--gray)' }}>
        Loading your setup…
      </p>
    </div>
  );
}
