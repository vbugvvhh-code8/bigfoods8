'use client';

import PromotionRow from './PromotionRow';

export default function PromotionsView({ promotions = [], loading = false, error }: any) {
  if (error) {
    return (
      <div className="rounded-xl p-4 text-[13px]" style={{ background: '#FBEAEA', color: '#C1453A', border: '1px solid #F0C6C6' }}>
        Couldn't load promotions — {error.message ?? 'please try refreshing.'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Promotions</h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--gray)' }}>Restaurant promotion subscriptions</p>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'white', border: '1px solid var(--line)' }}>
        {loading && <div className="text-[13px]" style={{ color: 'var(--gray)' }}>Loading…</div>}
        {!loading && promotions.length === 0 && <div className="text-[13px]" style={{ color: 'var(--gray)' }}>No promotions yet</div>}
        {!loading && promotions.map((p: any) => <PromotionRow key={p.id} promotion={p} />)}
      </div>
    </div>
  );
}
