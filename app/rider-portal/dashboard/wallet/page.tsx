'use client';

import { useMemo } from 'react';
import PageHeader from '@/components/admin/layout/PageHeader';
import WalletCard from '@/components/rider/dashboard/WalletCard';
import KpiTile from '@/components/restaurant/dashboard/KpiTile';
import useRider from '@/hooks/useRider';
import useRiderWallet from '@/hooks/useRiderWallet';

export default function RiderWalletPage() {
  const { rider, loading: riderLoading } = useRider();
  const { transactions, loading: walletLoading } = useRiderWallet(rider?.id);

  const { thisMonthEarned, deliveredCount } = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const inMonth = transactions.filter((t) => t.created_at && new Date(t.created_at) >= startOfMonth);
    return {
      thisMonthEarned: inMonth.reduce((s, t) => s + Number(t.amount), 0),
      deliveredCount: inMonth.filter((t) => Number(t.amount) > 0).length,
    };
  }, [transactions]);

  if (riderLoading || !rider) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Wallet" subtitle="Your balance and earnings" />

      <WalletCard riderId={rider.id} />

      {!walletLoading && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <KpiTile label="Earned this month" value={`₦${thisMonthEarned.toLocaleString()}`} />
          <KpiTile label="Deliveries this month" value={String(deliveredCount)} />
        </div>
      )}
    </div>
  );
}
