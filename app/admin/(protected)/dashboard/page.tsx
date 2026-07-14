'use client';

export const dynamic = 'force-dynamic';

import useAdminDashboard from '@/hooks/useAdminDashboard';
import DashboardView from '@/components/admin/dashboard/DashboardView';

export default function DashboardPage() {
  const { data, loading, error } = useAdminDashboard();
  return <DashboardView data={data} loading={loading} error={error} />;
}
