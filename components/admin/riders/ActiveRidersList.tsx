'use client';

export default function ActiveRidersList({ riders = [], loading = false }: any) {
  if (loading) return <div className="text-[13px]" style={{ color: 'var(--gray)' }}>Loading…</div>;
  if (!riders.length) return <div className="text-[13px]" style={{ color: 'var(--gray)' }}>No approved riders yet</div>;

  return (
    <div className="space-y-3 max-h-[420px] overflow-auto">
      {riders.map((r: any) => (
        <div key={r.id} className="flex items-center gap-2.5 py-1">
          <span
            className="w-[7px] h-[7px] rounded-full flex-shrink-0"
            style={{ background: r.status === 'online' ? '#1E9E5A' : 'var(--line)' }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[13px] truncate">{r.name}</div>
            <div className="text-[11px]" style={{ color: 'var(--gray)' }}>{r.vehicle_type ?? '—'}</div>
          </div>
          <div className="text-[11px] flex-shrink-0" style={{ color: 'var(--gray)' }}>{r.zone ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}
