'use client';

import ApprovalQueueTable from '@/components/admin/restaurants/ApprovalQueueTable';
import ActiveRidersList from './ActiveRidersList';

export default function RidersView({ riders = [], loading = false, error }: any) {
  if (error) {
    return (
      <div className="rounded-xl p-4 text-[13px]" style={{ background: '#FBEAEA', color: '#C1453A', border: '1px solid #F0C6C6' }}>
        Couldn't load riders — {error.message ?? 'please try refreshing.'}
      </div>
    );
  }

  const pending = (riders || []).filter((r: any) => r.approval_status === 'pending');
  const approved = (riders || []).filter((r: any) => r.approval_status === 'approved');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Riders</h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--gray)' }}>Manage rider onboarding and live status</p>
      </div>

      {/* Stacks on mobile, side-by-side from lg breakpoint up */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3.5">
        <div className="rounded-xl p-3.5" style={{ background: 'white', border: '1px solid var(--line)' }}>
          <p className="text-[12.5px] font-semibold mb-3">Approval queue</p>
          <ApprovalQueueTable items={pending} loading={loading} entityType="rider" />
        </div>

        <div className="rounded-xl p-3.5" style={{ background: 'white', border: '1px solid var(--line)' }}>
          <p className="text-[12.5px] font-semibold mb-3">Active riders</p>
          <ActiveRidersList riders={approved} loading={loading} />
        </div>
      </div>
    </div>
  );
}
