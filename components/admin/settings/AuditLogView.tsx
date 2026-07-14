'use client';

import useAdminQuery from '@/hooks/useAdminQuery';

export default function AuditLogView() {
  const { data, loading, error } = useAdminQuery('audit_log');

  if (loading) return <div className="text-[13px]" style={{ color: 'var(--gray)' }}>Loading…</div>;
  if (error) return <div className="text-[13px]" style={{ color: '#C1453A' }}>Couldn't load audit log</div>;

  const sorted = [...(data || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[480px] text-[12.5px]">
        <thead>
          <tr className="text-[10.5px] uppercase tracking-wide" style={{ color: 'var(--gray)', borderBottom: '1px solid var(--line)' }}>
            <th className="py-2.5 pr-3">Action</th>
            <th className="py-2.5 pr-3">Target</th>
            <th className="py-2.5 pr-3">When</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={3} className="py-4" style={{ color: 'var(--gray)' }}>No actions logged yet</td></tr>
          )}
          {sorted.slice(0, 100).map((row: any) => (
            <tr key={row.id} style={{ borderBottom: '1px solid var(--line)' }}>
              <td className="py-2 pr-3 font-medium">{row.action}</td>
              <td className="py-2 pr-3" style={{ color: 'var(--gray)' }}>{row.target_table} · {row.target_id?.slice(0, 8)}</td>
              <td className="py-2 pr-3" style={{ color: 'var(--gray)' }}>{new Date(row.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
