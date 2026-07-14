'use client';

export const dynamic = 'force-dynamic';

import PayoutsView from '@/components/admin/payouts/PayoutsView';
import useAdminQuery from '@/hooks/useAdminQuery';

export default function PayoutsPage() {
  const { data, loading, error } = useAdminQuery('payouts_with_riders');
  return <PayoutsView payouts={data ?? []} loading={loading} error={error} />;
}
