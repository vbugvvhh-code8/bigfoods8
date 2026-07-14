'use client';

import RiderEtaBadge from '@/components/restaurant/dashboard/RiderEtaBadge';
import AcceptingHoursCard from '@/components/restaurant/dashboard/AcceptingHoursCard';
import useRestaurant from '@/hooks/useRestaurant';

const STATUS_COPY: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending review', color: 'var(--orange)' },
  approved: { label: 'Approved', color: 'var(--green)' },
  rejected: { label: 'Not approved', color: 'var(--red)' },
};

export default function DashboardOverviewPage() {
  const { restaurant, loading, refresh } = useRestaurant();

  if (loading || !restaurant) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  const status = STATUS_COPY[restaurant.approval_status] ?? { label: restaurant.approval_status, color: 'var(--gray)' };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[17px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {restaurant.name}
          </h1>
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--peach)', color: status.color }}>
            {status.label}
          </span>
        </div>
        <p className="text-[12px] mb-2" style={{ color: 'var(--gray)' }}>
          {restaurant.category} · {restaurant.address}
        </p>
        <RiderEtaBadge latitude={restaurant.latitude ?? undefined} longitude={restaurant.longitude ?? undefined} />
      </div>

      <AcceptingHoursCard restaurant={restaurant} onUpdated={() => refresh()} />

      {restaurant.approval_status === 'pending' && (
        <div className="p-3 rounded-[10px]" style={{ background: 'var(--peach)' }}>
          <p className="text-[12px]" style={{ color: 'var(--ink)' }}>
            Your restaurant is awaiting admin review. You'll be notified once it's approved.
          </p>
        </div>
      )}
    </div>
  );
}
