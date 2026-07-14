'use client';

export default function WaitlistView({ rows = [], loading = false, error }: any) {
  if (error) {
    return (
      <div className="rounded-xl p-4 text-[13px]" style={{ background: '#FBEAEA', color: '#C1453A', border: '1px solid #F0C6C6' }}>
        Couldn't load waitlist — {error.message ?? 'please try refreshing.'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Waitlist</h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--gray)' }}>
          Demand from areas we don't operate in yet — by location and intent
        </p>
      </div>

      <div className="rounded-xl overflow-x-auto" style={{ background: 'white', border: '1px solid var(--line)' }}>
        <table className="w-full text-left min-w-[520px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wide" style={{ color: 'var(--gray)', borderBottom: '1px solid var(--line)' }}>
              <th className="py-3 px-4">State</th>
              <th className="py-3 px-4">Area</th>
              <th className="py-3 px-4">Intent</th>
              <th className="py-3 px-4">Submissions</th>
              <th className="py-3 px-4">Most recent</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="py-4 px-4 text-[13px]" style={{ color: 'var(--gray)' }}>Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="py-4 px-4 text-[13px]" style={{ color: 'var(--gray)' }}>No waitlist submissions yet</td></tr>
            )}
            {!loading && rows.map((r: any, i: number) => (
              <tr key={i} className="text-[13px]" style={{ borderBottom: '1px solid var(--line)' }}>
                <td className="py-2.5 px-4">{r.state}</td>
                <td className="py-2.5 px-4">{r.area}</td>
                <td className="py-2.5 px-4 capitalize">{r.intent}</td>
                <td className="py-2.5 px-4 font-semibold">{r.submissions}</td>
                <td className="py-2.5 px-4" style={{ color: 'var(--gray)' }}>
                  {r.most_recent ? new Date(r.most_recent).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
