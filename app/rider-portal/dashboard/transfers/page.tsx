'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import PageHeader from '@/components/admin/layout/PageHeader';
import useRider from '@/hooks/useRider';
import useRiderTransfers from '@/hooks/useRiderTransfers';

const REASON_LABEL: Record<string, string> = {
  accident: 'Accident',
  breakdown: 'Vehicle breakdown',
  emergency: 'Emergency',
  fuel: 'Out of fuel',
  other: 'Other',
};

export default function RiderTransfersPage() {
  const { rider, loading: riderLoading } = useRider();
  const { openTransfers, myClaimed, loading, error, busy, accept, confirmHandoff } = useRiderTransfers(rider?.id);
  const [code, setCode] = useState('');

  if (riderLoading || !rider) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Delivery hand-offs" subtitle="Help finish a delivery for another rider" />

      {myClaimed && (
        <div className="p-4 rounded-[12px]" style={{ background: 'var(--peach)' }}>
          <p className="text-[12.5px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>
            You claimed a hand-off
          </p>
          <p className="text-[11.5px] mb-3" style={{ color: 'var(--gray)' }}>
            Meet the other rider, then enter the code shown on their phone once they hand you the food.
          </p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4-digit code"
              inputMode="numeric"
              className="flex-1 px-3 py-2.5 rounded-[9px] text-[13px] outline-none tracking-widest"
              style={{ border: '1px solid var(--line)', background: 'var(--white)' }}
            />
            <button
              onClick={() => confirmHandoff(myClaimed.id, code).then((ok) => ok && setCode(''))}
              disabled={code.length !== 4 || busy}
              className="px-4 rounded-[9px] text-[12.5px] font-semibold text-white disabled:opacity-40 flex items-center gap-1.5"
              style={{ background: 'var(--orange)' }}
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Confirm
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11.5px] p-3 rounded-[9px]" style={{ background: '#FEF2F2', color: 'var(--red)' }}>
          {error}
        </p>
      )}

      {!myClaimed && (
        <>
          <p className="text-[11.5px]" style={{ color: 'var(--gray)' }}>
            Other riders sometimes can't finish a delivery after picking up food. Accepting one here means going to
            meet them and collecting it, then delivering it yourself — you'll earn the reward % they offered.
          </p>

          {loading ? (
            <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>Loading…</p>
          ) : openTransfers.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={{ border: '1px dashed var(--line)' }}>
              <p className="text-[12.5px]" style={{ color: 'var(--gray)' }}>No hand-off requests right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {openTransfers.map((t) => (
                <div key={t.id} className="p-3.5 rounded-[10px]" style={{ border: '1px solid var(--line)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>
                      {REASON_LABEL[t.cancellation_reason] ?? t.cancellation_reason}
                    </span>
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--orange)' }}>
                      {t.reward_pct}% reward
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: 'var(--gray)' }}>
                      {new Date(t.created_at).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => accept(t.id)}
                      disabled={busy}
                      className="px-3.5 py-1.5 rounded-[8px] text-[11.5px] font-semibold text-white disabled:opacity-40"
                      style={{ background: 'var(--orange)' }}
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
