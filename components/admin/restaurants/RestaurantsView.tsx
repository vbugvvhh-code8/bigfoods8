'use client';

import Link from 'next/link';
import ApprovalQueueTable from './ApprovalQueueTable';
import useAdminAction from '@/hooks/useAdminAction';

export default function RestaurantsView({ restaurants = [], loading = false, error }: any) {
  const { setAcceptingOrders, loadingIds } = useAdminAction();

  if (error) {
    return (
      <div className="rounded-xl p-4 text-[13px]" style={{ background: '#FBEAEA', color: '#C1453A', border: '1px solid #F0C6C6' }}>
        Couldn't load restaurants — {error.message ?? 'please try refreshing.'}
      </div>
    );
  }

  const pending = (restaurants || []).filter((r: any) => r.approval_status === 'pending');
  const approved = (restaurants || []).filter((r: any) => r.approval_status === 'approved');

  async function handleToggle(id: string, current: boolean) {
    try {
      await setAcceptingOrders(id, !current);
    } catch (err: any) {
      alert(err?.message || 'Failed to update accepting status');
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-semibold" style={{fontFamily: "'Space Grotesk', sans-serif"}}>Restaurants</h1>
        <p className="text-[11.5px] mt-0.5" style={{color: 'var(--gray)'}}>Manage restaurant onboarding and approvals</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3.5">
        <div className="rounded-xl p-3.5" style={{background: 'white', border: '1px solid var(--line)'}}>
          <p className="text-[12.5px] font-semibold mb-3">Approval queue</p>
          <ApprovalQueueTable items={pending} loading={loading} entityType="restaurant" />
        </div>

        <div className="rounded-xl p-3.5" style={{background: 'white', border: '1px solid var(--line)'}}>
          <p className="text-[12.5px] font-semibold mb-3">Active restaurants</p>
          <div className="space-y-3 max-h-[420px] overflow-auto">
            {loading && <div className="text-[13px]" style={{color: 'var(--gray)'}}>Loading…</div>}
            {!loading && approved.length === 0 && (
              <div className="text-[13px]" style={{color: 'var(--gray)'}}>No approved restaurants yet</div>
            )}
            {!loading && approved.map((r: any) => {
              const isLoading = loadingIds.includes(r.id);
              return (
                <div key={r.id} className="flex items-center justify-between">
                  <Link href={`/admin/restaurants/${r.id}`} className="min-w-0 hover:opacity-70">
                    <div className="font-medium text-[13px] truncate">{r.name}</div>
                    <div className="text-[11px]" style={{color: 'var(--gray)'}}>{r.zone ?? '—'}</div>
                  </Link>
                  <button
                    onClick={() => handleToggle(r.id, r.is_accepting_orders)}
                    disabled={isLoading}
                    className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ml-3"
                    style={{ background: r.is_accepting_orders ? 'var(--orange)' : 'var(--line)', opacity: isLoading ? 0.6 : 1 }}
                  >
                    <span
                      className="absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white transition-all"
                      style={{ left: r.is_accepting_orders ? '19px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
