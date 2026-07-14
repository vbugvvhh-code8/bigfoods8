'use client';

export const dynamic = 'force-dynamic';

import DisputesView from '@/components/admin/disputes/DisputesView';
import useAdminQuery from '@/hooks/useAdminQuery';

export default function DisputesPage() {
  const { data, loading, error } = useAdminQuery('disputes');
  return <DisputesView disputes={data ?? []} loading={loading} error={error} />;
}
