'use client';

export const dynamic = 'force-dynamic';

import WaitlistView from '@/components/admin/waitlist/WaitlistView';
import useAdminQuery from '@/hooks/useAdminQuery';

export default function WaitlistPage() {
  const { data, loading, error } = useAdminQuery('waitlist_summary');
  return <WaitlistView rows={data ?? []} loading={loading} error={error} />;
}
