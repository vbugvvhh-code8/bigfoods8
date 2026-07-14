'use client';

import PayoutRow from './PayoutRow';

export default function PayoutsView({ payouts = [], loading = false, error }: any) {
  if (error) {
    return (
      <div className="rounded-xl p-4 text-[13px]" style={{ background: '#FBEAEA', color: '#C1453A', border: '1px solid #F0C6C6' }}>
        Couldn't load payouts — {error.message ?? 'please try refreshing.'}
      </div>
    );
  }

  const pending = payouts.filter((p: any) => p.status === 'pending');
  const settled = payouts.filter((p: any) => p.status !== 'pending');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Payouts</h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--gray)' }}>Rider withdrawal requests</p>
      </div>

      <div className="rounded-xl p-4 mb-3.5" style={{ background: 'white', border: '1px solid var(--line)' }}>
        <p className="text-[12.5px] font-semibold mb-2">Pending</p>
        {loading && <div className="text-[13px]" style={{ color: 'var(--gray)' }}>Loading…</div>}
        {!loading && pending.length === 0 && <div className="text-[13px]" style={{ color: 'var(--gray)' }}>No pending requests</div>}
        {!loading && pending.map((p: any) => <PayoutRow key={p.id} payout={p} />)}
      </div>

      {!loading && settled.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'white', border: '1px solid var(--line)' }}>
          <p className="text-[12.5px] font-semibold mb-2">History</p>
          {settled.map((p: any) => <PayoutRow key={p.id} payout={p} />)}
        </div>
      )}
    </div>
  );
}
