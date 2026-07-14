'use client';

import useAdminAction from '@/hooks/useAdminAction';

type EntityType = 'restaurant' | 'rider';

export default function ApprovalQueueTable({
  items = [],
  loading = false,
  entityType = 'restaurant',
}: {
  items?: any[];
  loading?: boolean;
  entityType?: EntityType;
}) {
  const { reviewApplication, loadingIds } = useAdminAction();
  const emptyLabel = entityType === 'rider' ? 'No riders awaiting approval' : 'No restaurants awaiting approval';

  async function handleDecision(id: string, decision: 'approved' | 'rejected') {
    try {
      await reviewApplication(entityType, id, decision);
    } catch (err: any) {
      alert(err?.message || `Failed to ${decision === 'approved' ? 'approve' : 'reject'}`);
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left min-w-[420px]" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
        <thead className="sr-only">
          <tr>
            <th>Name</th>
            <th>Detail</th>
            <th>Zone</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={4} className="py-4 text-[13px]" style={{ color: 'var(--gray)' }}>Loading…</td></tr>
          )}
          {!loading && items.length === 0 && (
            <tr><td colSpan={4} className="py-4 text-[13px]" style={{ color: 'var(--gray)' }}>{emptyLabel}</td></tr>
          )}
          {!loading && items.map((r: any) => {
            const isLoading = loadingIds.includes(r.id);
            return (
              <tr key={r.id} className="bg-white" style={{ border: '1px solid var(--line)', borderRadius: 8 }}>
                <td className="py-3 px-3">
                  <div className="font-medium text-[13px]">{r.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--gray)' }}>
                    {entityType === 'rider' ? (r.vehicle_type ?? 'Rider') : 'Restaurant'}
                  </div>
                </td>
                <td className="py-3 px-3 text-[13px]" style={{ color: 'var(--gray)' }}>{r.zone ?? '—'}</td>
                <td className="py-3 px-3 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => handleDecision(r.id, 'rejected')}
                      disabled={isLoading}
                      className="px-3 py-1 rounded-md text-[13px]"
                      style={{ border: '1px solid var(--line)', opacity: isLoading ? 0.6 : 1 }}
                    >
                      {isLoading ? 'Processing…' : 'Reject'}
                    </button>
                    <button
                      onClick={() => handleDecision(r.id, 'approved')}
                      disabled={isLoading}
                      className="px-3 py-1 rounded-md bg-[var(--orange)] text-white text-[13px]"
                      style={{ opacity: isLoading ? 0.6 : 1 }}
                    >
                      {isLoading ? 'Processing…' : 'Approve'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
