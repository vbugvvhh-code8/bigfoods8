'use client';

import { useState } from 'react';
import useAdminQuery from '@/hooks/useAdminQuery';
import getBrowserSupabase from '@/lib/supabase/client';

export default function PlatformSettingsForm() {
  const { data, loading, error, mutate } = useAdminQuery('platform_settings');
  const [savingSeed, setSavingSeed] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState<string | null>(null);
  const supabase = getBrowserSupabase();

  if (loading) return <div className="text-[13px]" style={{ color: 'var(--gray)' }}>Loading…</div>;
  if (error) return <div className="text-[13px]" style={{ color: '#C1453A' }}>Couldn't load platform settings</div>;

  const showSeedRow = (data || []).find((s: any) => s.key === 'show_seed_data');
  const emailLimitRow = (data || []).find((s: any) => s.key === 'daily_email_limit');
  const seedVisible = showSeedRow?.value === true || showSeedRow?.value === 'true';

  async function toggleSeedData() {
    setSavingSeed(true);
    const { error } = await supabase.rpc('set_seed_data_visibility', { visible: !seedVisible });
    setSavingSeed(false);
    if (error) {
      alert(error.message || 'Failed to update');
      return;
    }
    await mutate();
  }

  async function saveEmailLimit() {
    const value = Number(limitDraft);
    if (Number.isNaN(value) || value < 0) {
      alert('Enter a valid number');
      return;
    }
    setSavingLimit(true);
    const { error } = await supabase.from('platform_settings').update({ value }).eq('key', 'daily_email_limit');
    setSavingLimit(false);
    if (error) {
      alert(error.message || 'Failed to update');
      return;
    }
    await mutate();
    setLimitDraft(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5" style={{ borderBottom: '1px solid var(--line)' }}>
        <div>
          <div className="font-medium text-[13px]">Show seed/demo data</div>
          <div className="text-[11px]" style={{ color: 'var(--gray)' }}>
            Turn off to hide all test restaurants, riders, and orders platform-wide
          </div>
        </div>
        <button
          onClick={toggleSeedData}
          disabled={savingSeed}
          className="w-11 h-6 rounded-full relative flex-shrink-0 self-start sm:self-auto"
          style={{ background: seedVisible ? 'var(--orange)' : 'var(--line)', opacity: savingSeed ? 0.6 : 1 }}
        >
          <span
            className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all"
            style={{ left: seedVisible ? '23px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
          />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5">
        <div>
          <div className="font-medium text-[13px]">Daily transactional email limit</div>
          <div className="text-[11px]" style={{ color: 'var(--gray)' }}>
            Applies to all emails except verification codes, which are unlimited. Not yet enforced by
            the email system — this is the configurable value it will read once that's wired up.
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type="number"
            value={limitDraft ?? emailLimitRow?.value ?? ''}
            onChange={(e) => setLimitDraft(e.target.value)}
            className="rounded-md px-2.5 py-1.5 text-[13px] w-full sm:w-[90px]"
            style={{ border: '1px solid var(--line)' }}
          />
          <button
            onClick={saveEmailLimit}
            disabled={savingLimit || limitDraft === null}
            className="px-3 py-1.5 rounded-md text-[12.5px] font-medium text-white flex-shrink-0"
            style={{ background: 'var(--orange)', opacity: savingLimit || limitDraft === null ? 0.5 : 1 }}
          >
            {savingLimit ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
