'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/admin/layout/PageHeader';
import getBrowserSupabase from '@/lib/supabase/client';

type AuditRow = { id: string; admin_id: string | null; action: string; target_table: string | null; target_id: string | null; details: Record<string, any> | null; created_at: string | null };

export default function MenuAuditPage() {
  const [supabase] = useState(() => getBrowserSupabase());
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from('audit_log').select('id, admin_id, action, target_table, target_id, details, created_at')
      .eq('target_table', 'menu_items').order('created_at', { ascending: false }).limit(300);
    if (error) setError('Could not load menu audit history. Confirm that your admin account has permission to read the audit log.');
    else setRows((data ?? []) as AuditRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);
  const filtered = rows.filter(row => {
    const text = [row.action, row.target_id, row.admin_id, JSON.stringify(row.details ?? {})].join(' ').toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return <main className="mx-auto max-w-6xl">
    <PageHeader title="Menu change history" subtitle="Audit trail for menu item creation, edits, pricing, availability and deletion."/>
    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search item, action, ID or changed value…" className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm" style={{borderColor:'var(--line)',background:'white'}}/>
      <button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" style={{background:'var(--orange)'}}><RefreshCw className="h-4 w-4"/>{loading?'Refreshing…':'Refresh history'}</button>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl p-4 text-sm" style={{background:'#FCE8E6',color:'#B42318'}}>{error}</p>}
    <div className="overflow-hidden rounded-xl border" style={{borderColor:'var(--line)',background:'white'}}>
      <div className="border-b px-4 py-3 text-xs" style={{borderColor:'var(--line)',color:'var(--gray)'}}><ClipboardList className="mr-2 inline h-4 w-4"/>{filtered.length} recorded changes · latest 300 entries</div>
      {loading ? <p className="p-6 text-sm" style={{color:'var(--gray)'}}>Loading history…</p> : filtered.length===0 ? <p className="p-6 text-sm" style={{color:'var(--gray)'}}>No menu changes found for this search. New changes will appear after they are recorded.</p> :
        <div className="divide-y" style={{borderColor:'var(--line)'}}>{filtered.map(row=><article key={row.id} className="p-4" style={{borderColor:'var(--line)'}}>
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold" style={{color:'var(--ink)'}}>{String(row.details?.item_name ?? 'Menu item')} · {row.action.replaceAll('_',' ')}</p><p className="mt-1 text-[11px]" style={{color:'var(--gray)'}}>Item ID: {row.target_id ?? '—'} · Actor: {row.admin_id ?? 'System / service'} {row.details?.actor_role ? '('+row.details.actor_role+')' : ''}</p></div><time className="text-[11px]" style={{color:'var(--gray)'}}>{row.created_at ? new Date(row.created_at).toLocaleString() : 'Time unavailable'}</time></div>
          {row.details?.changes && <div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(row.details.changes as Record<string,{old:unknown;new:unknown}>).map(([field,change])=><div key={field} className="rounded-lg p-3 text-xs" style={{background:'#F7F4EF'}}><p className="mb-1 font-semibold capitalize" style={{color:'var(--ink)'}}>{field.replaceAll('_',' ')}</p><p style={{color:'#B42318'}}>Before: {String(change?.old ?? '—')}</p><p style={{color:'#207245'}}>After: {String(change?.new ?? '—')}</p></div>)}</div>}
          {!row.details?.changes && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg p-3 text-[11px]" style={{background:'#F7F4EF',color:'var(--gray)'}}>{JSON.stringify(row.details ?? {},null,2)}</pre>}
        </article>)}</div>}
    </div>
  </main>;
}
