'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';
import { extractEdgeFunctionError } from '@/lib/extractEdgeFunctionError';

interface Row {
  id: string;
  name: string;
  state: string;
  zone: string | null;
  vendor_type: string;
  cac_number: string | null;
  verified_at: string | null;
}

/** CAC claims waiting for a check. Verified vendors lose the earnings cap. */
export default function RegistrationsPage() {
  const supabase = getBrowserSupabase();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'verified'>('pending');

  const load = useCallback(async () => {
    const { data: restaurants, error: err } = await supabase
      .from('restaurants')
      .select('id, name, state, zone, vendor_type')
      .eq('registration_status', 'registered')
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const ids = (restaurants ?? []).map((r) => r.id);
    const { data: details } = ids.length
      ? await supabase
          .from('restaurant_owner_details')
          .select('restaurant_id, cac_number, registration_verified_at')
          .in('restaurant_id', ids)
      : { data: [] as any[] };
    const byId = new Map((details ?? []).map((d: any) => [d.restaurant_id, d]));
    setRows(
      (restaurants ?? []).map((r: any) => ({
        ...r,
        cac_number: byId.get(r.id)?.cac_number ?? null,
        verified_at: byId.get(r.id)?.registration_verified_at ?? null,
      }))
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, decision: 'verify' | 'reject') {
    setBusy(id);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke('admin-verify-registration', {
      body: { restaurant_id: id, decision },
    });
    if (fnError) setError(await extractEdgeFunctionError(fnError, 'Could not save the decision.'));
    else if (data?.error) setError(data.error);
    await load();
    setBusy(null);
  }

  const shown = rows.filter((r) => (filter === 'verified' ? !!r.verified_at : !r.verified_at));

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          CAC registrations
        </h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--gray)' }}>
          Check each number on the CAC public search, then confirm. Confirmed vendors have no earnings limit.
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        {(['pending', 'verified'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3.5 py-2 rounded-lg text-[12.5px] font-medium capitalize"
            style={{
              background: filter === f ? 'var(--peach)' : 'white',
              border: '1px solid var(--line)',
              color: filter === f ? 'var(--orange-dark)' : 'var(--gray)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-[12px] mb-3" style={{ color: 'var(--red)' }} role="alert">
          {error}
        </p>
      )}

      <div className="rounded-xl bg-white" style={{ border: '1px solid var(--line)' }}>
        {loading ? (
          <p className="p-4 text-[12.5px]" style={{ color: 'var(--gray)' }}>
            Loading…
          </p>
        ) : shown.length === 0 ? (
          <p className="p-4 text-[12.5px]" style={{ color: 'var(--gray)' }}>
            Nothing here.
          </p>
        ) : (
          <ul>
            {shown.map((r, i) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate">{r.name}</p>
                  <p className="text-[11.5px]" style={{ color: 'var(--gray)' }}>
                    {r.vendor_type === 'home_kitchen' ? 'Home kitchen' : 'Restaurant'} · {r.zone ?? '—'}, {r.state}
                  </p>
                  <p className="text-[12px] mt-1">
                    CAC: <span className="font-mono">{r.cac_number ?? '—'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="https://search.cac.gov.ng/home"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11.5px] flex items-center gap-1 underline"
                    style={{ color: 'var(--gray)' }}
                  >
                    CAC search <ExternalLink className="w-3 h-3" />
                  </a>
                  {busy === r.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : r.verified_at ? (
                    <button
                      onClick={() => decide(r.id, 'reject')}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                      style={{ border: '1px solid var(--line)', color: 'var(--red)' }}
                    >
                      Revoke
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => decide(r.id, 'reject')}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                        style={{ border: '1px solid var(--line)', color: 'var(--red)' }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => decide(r.id, 'verify')}
                        disabled={!r.cac_number}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-40"
                        style={{ background: 'var(--orange)' }}
                      >
                        Confirm
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
