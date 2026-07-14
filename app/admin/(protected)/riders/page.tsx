'use client';

export const dynamic = 'force-dynamic';

import RidersView from '@/components/admin/riders/RidersView';
import useAdminQuery from '@/hooks/useAdminQuery';

export default function RidersPage() {
  const { data, loading, error } = useAdminQuery('riders');
  return <RidersView riders={data ?? []} loading={loading} error={error} />;
}
