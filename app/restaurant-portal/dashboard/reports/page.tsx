'use client';

import ReportsList from '@/components/restaurant/dashboard/ReportsList';
import useRestaurant from '@/hooks/useRestaurant';

export default function ReportsPage() {
  const { restaurant, loading } = useRestaurant();

  if (loading || !restaurant) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  return <ReportsList restaurantId={restaurant.id} />;
}
