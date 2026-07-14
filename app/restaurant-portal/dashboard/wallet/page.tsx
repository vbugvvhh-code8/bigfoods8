'use client';

import WalletCard from '@/components/restaurant/dashboard/WalletCard';
import useRestaurant from '@/hooks/useRestaurant';

export default function WalletPage() {
  const { restaurant, loading } = useRestaurant();

  if (loading || !restaurant) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  return <WalletCard restaurantId={restaurant.id} />;
}
