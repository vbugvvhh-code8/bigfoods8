'use client';

import { useState } from 'react';
import useAdminQuery from '@/hooks/useAdminQuery';
import getBrowserSupabase from '@/lib/supabase/client';

export default function PricingConfigForm() {
  const { data, loading, error, mutate } = useAdminQuery('pricing_config');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const supabase = getBrowserSupabase();

  if (loading) return <div className="text-[13px]" style={{ color: 'var(--gray)' }}>Loading…</div>;
  if (error) return <div className="text-[13px]" style={{ color: '#C1453A' }}>Couldn't load pricing config</div>;

  async function handleSave(key: string) {
    const raw = edits[key];
    const value = Number(raw);
    if (Number.isNaN(value)) {
      alert('Enter a valid number');
      return;
    }
    setSavingKey(key);
    const { error } = await supabase.functions.invoke('admin-update-pricing', { body: { key, value } });
    setSavingKey(null);
    if (error) {
      alert(error.message || 'Failed to update');
      return;
    }
    await mutate();
    setEdits((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {(data || []).map((row: any) => {
        const current = edits[row.key] ?? String(row.value);
        const dirty = edits[row.key] !== undefined && edits[row.key] !== String(row.value);
        return (
          <div
            key={row.key}
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2.5"
            style={{ borderBottom: '1px solid var(--line)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[13px]">{row.key}</div>
              <div className="text-[11px]" style={{ color: 'var(--gray)' }}>{row.description}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                type="number"
                value={current}
                onChange={(e) => setEdits((edits) => ({ ...edits, [row.key]: e.target.value }))}
                className="rounded-md px-2.5 py-1.5 text-[13px] w-full sm:w-[110px]"
                style={{ border: '1px solid var(--line)' }}
              />
              <button
                onClick={() => handleSave(row.key)}
                disabled={!dirty || savingKey === row.key}
                className="px-3 py-1.5 rounded-md text-[12.5px] font-medium text-white flex-shrink-0"
                style={{ background: 'var(--orange)', opacity: !dirty || savingKey === row.key ? 0.5 : 1 }}
              >
                {savingKey === row.key ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
