'use client';

import DisputeRow from './DisputeRow';

export default function DisputesView({ disputes = [], loading = false, error }: any) {
  if (error) {
    return (
      <div className="rounded-xl p-4 text-[13px]" style={{ background: '#FBEAEA', color: '#C1453A', border: '1px solid #F0C6C6' }}>
        Couldn't load disputes — {error.message ?? 'please try refreshing.'}
      </div>
    );
  }

  const sorted = [...disputes].sort((a, b) => (a.status === 'open' ? -1 : 1));

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Disputes</h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--gray)' }}>Escalated issues needing a decision</p>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'white', border: '1px solid var(--line)' }}>
        {loading && <div className="text-[13px]" style={{ color: 'var(--gray)' }}>Loading…</div>}
        {!loading && sorted.length === 0 && <div className="text-[13px]" style={{ color: 'var(--gray)' }}>No disputes right now</div>}
        {!loading && sorted.map((d: any) => <DisputeRow key={d.id} dispute={d} />)}
      </div>
    </div>
  );
}
