export default function KpiGrid({ kpis = [], loading = false }: any) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl p-3.5 animate-pulse" style={{ background: 'white', border: '1px solid var(--line)', height: 84 }} />
        ))}
      </div>
    );
  }

  if (!kpis.length) {
    return (
      <div className="rounded-xl p-4 mb-5 text-[13px]" style={{ background: 'white', border: '1px solid var(--line)', color: 'var(--gray)' }}>
        No KPI data available yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      {kpis.map((k: any) => (
        <div key={k.label} className="rounded-xl p-3.5" style={{background: 'white', border: '1px solid var(--line)'}}>
          <p className="text-[10.5px] uppercase tracking-wide mb-2" style={{color: 'var(--gray)'}}>{k.label}</p>
          <p className="text-[21px] font-bold" style={{fontFamily: "'Space Grotesk', sans-serif"}}>{k.value}</p>
          {k.trend && (
            <p className="text-[10.5px] font-semibold mt-1.5" style={{color: k.up ? '#1E9E5A' : '#C1453A'}}>{k.trend}</p>
          )}
        </div>
      ))}
    </div>
  );
}
