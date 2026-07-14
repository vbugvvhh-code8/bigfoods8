'use client';

export const dynamic = 'force-dynamic';

import PromotionsView from '@/components/admin/promotions/PromotionsView';
import useAdminQuery from '@/hooks/useAdminQuery';

export default function PromotionsPage() {
  const { data, loading, error } = useAdminQuery('promotions_with_restaurants');
  return <PromotionsView promotions={data ?? []} loading={loading} error={error} />;
}
