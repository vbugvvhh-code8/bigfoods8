'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';
import { NIGERIA_STATES } from '@/lib/nigeriaLocations';

interface Area {
  id: number;
  state: string;
  lga: string;
  is_active: boolean;
}

/**
 * Service areas. An LGA is "on" when BigFoods has riders there. Riders can only
 * pick an active zone, and the on/off state is the source of truth for coverage.
 */
export default function AreasPage() {
  const supabase = getBrowserSupabase();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<string>('Anambra');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('locations')
      .select('id, state, lga, is_active')
      .order('state')
      .order('lga');
    if (err) setError(err.message);
    else setAreas((data as Area[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const activeByState = useMemo(() => {
    const m: Record<string, number> = {};
    areas.forEach((a) => {
      if (a.is_active) m[a.state] = (m[a.state] ?? 0) + 1;
    });
    return m;
  }, [areas]);

  const visible = areas.filter((a) => a.state === state);
  const totalActive = areas.filter((a) => a.is_active).length;

  async function toggle(area: Area) {
    setBusyId(area.id);
    setError(null);
    const next = !area.is_active;
    const { error: err } = await supabase.from('locations').update({ is_active: next }).eq('id', area.id);
    if (err) {
      setError(err.message);
    } else {
      setAreas((prev) => prev.map((a) => (a.id === area.id ? { ...a, is_active: next } : a)));
      // Best-effort audit trail; never blocks the change.
      await supabase.rpc('log_admin_action', {
        p_action: next ? 'area_activated' : 'area_deactivated',
        p_target_table: 'locations',
        p_target_id: String(area.id),
        p_details: { state: area.state, lga: area.lga },
      });
    }
    setBusyId(null);
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Service areas
        </h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--gray)' }}>
          Switch an area on when you have riders there. {totalActive} of {areas.length} areas are on.
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="area-state" className="block text-[12px] font-medium mb-1.5">
          State
        </label>
        <select
          id="area-state"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full max-w-[320px] px-3 py-2.5 rounded-[9px] text-[13px] outline-none bg-white"
          style={{ border: '1px solid var(--line)' }}
        >
          {NIGERIA_STATES.map((st) => (
            <option key={st} value={st}>
              {st}
              {activeByState[st] ? ` (${activeByState[st]} on)` : ''}
            </option>
          ))}
        </select>
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
        ) : (
          <ul>
            {visible.map((a, i) => (
              <li
                key={a.id}
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}
              >
                <span className="text-[13px]">{a.lga}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={a.is_active}
                  aria-label={`${a.lga} ${a.is_active ? 'on' : 'off'}`}
                  onClick={() => toggle(a)}
                  disabled={busyId === a.id}
                  className="relative w-10 h-6 rounded-full transition-colors disabled:opacity-50 flex-shrink-0"
                  style={{ background: a.is_active ? 'var(--orange)' : 'var(--line)' }}
                >
                  {busyId === a.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  ) : (
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                      style={{ left: a.is_active ? 18 : 2 }}
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
