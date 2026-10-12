'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';

interface Row {
  state: string;
  paid_sellers: number;
  accepting: boolean;
}

const TARGET = 1000;

/**
 * Paid sellers per state. There is no hard cap: a state past 1,000 turns red and
 * an admin decides when to stop accepting new sellers there.
 */
export default function SellerPlacesPage() {
  const supabase = getBrowserSupabase();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('admin_state_seat_counts');
    if (err) setError(err.message);
    else setRows(((data as Row[]) ?? []).map((r) => ({ ...r, paid_sellers: Number(r.paid_sellers) })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(row: Row) {
    setBusy(row.state);
    setError(null);
    const next = !row.accepting;
    const { error: err } = await supabase
      .from('state_registration')
      .update({ accepting: next, closed_at: next ? null : new Date().toISOString() })
      .eq('state', row.state);
    if (err) setError(err.message);
    else setRows((rs) => rs.map((r) => (r.state === row.state ? { ...r, accepting: next } : r)));
    setBusy(null);
  }

  if (loading) {
    return <p className="text-[13px] py-6" style={{ color: 'var(--gray)' }}>Loading…</p>;
  }

  const over = rows.filter((r) => r.paid_sellers >= TARGET).length;

  return (
    <div className="max-w-[720px]">
      <h1 className="text-[20px] font-semibold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Seller places</h1>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--gray)' }}>
        Paid sellers in each state. States at {TARGET.toLocaleString()} or more show in red. Nothing stops sign-ups
        automatically. Press <strong>Stop accepting</strong> when you want a state closed. {over} state{over === 1 ? '' : 's'} at or over {TARGET.toLocaleString()}.
      </p>
      {error && <p className="text-[12px] mb-3" style={{ color: 'var(--red)' }} role="alert">{error}</p>}

      <ul className="space-y-1.5">
        {rows.map((r) => {
          const full = r.paid_sellers >= TARGET;
          return (
            <li
              key={r.state}
              className="flex items-center gap-3 p-3 rounded-[10px]"
              style={{
                border: `1px solid ${full ? 'var(--red)' : 'var(--line)'}`,
                background: full ? '#FEF2F2' : 'var(--white)',
              }}
            >
              <span className="flex-1 text-[13px] font-medium">{r.state}</span>
              <span className="text-[13px] tabular-nums" style={{ color: full ? 'var(--red)' : 'var(--ink)', fontWeight: full ? 600 : 400 }}>
                {r.paid_sellers.toLocaleString()}
              </span>
              <span className="text-[11px] w-[64px] text-right" style={{ color: r.accepting ? 'var(--green)' : 'var(--red)' }}>
                {r.accepting ? 'Open' : 'Closed'}
              </span>
              <button
                onClick={() => toggle(r)}
                disabled={busy === r.state}
                className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-40 flex items-center gap-1.5"
                style={r.accepting
                  ? { background: full ? 'var(--red)' : 'var(--white)', color: full ? '#fff' : 'var(--ink)', border: '1px solid ' + (full ? 'var(--red)' : 'var(--line)') }
                  : { background: 'var(--ink)', color: '#fff', border: '1px solid var(--ink)' }}
              >
                {busy === r.state ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {r.accepting ? 'Stop accepting' : 'Reopen'}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
