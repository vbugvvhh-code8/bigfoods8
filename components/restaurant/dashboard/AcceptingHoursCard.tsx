'use client';

import { useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type { Restaurant } from '@/types/database';

interface AcceptingHoursCardProps {
  restaurant: Restaurant;
  onUpdated: (restaurant: Restaurant) => void;
}

export default function AcceptingHoursCard({ restaurant, onUpdated }: AcceptingHoursCardProps) {
  const supabase = getBrowserSupabase();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateField(patch: Partial<Pick<Restaurant, 'is_accepting_orders' | 'accepting_start_time' | 'accepting_end_time'>>) {
    setSaving(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke('restaurant-settings-save', { body: patch });
    setSaving(false);
    if (fnError || data?.error) {
      setError(fnError?.message ?? data?.error ?? 'Could not update this.');
      return;
    }
    onUpdated(data.restaurant as Restaurant);
  }

  return (
    <div className="p-4 rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Accepting orders
        </p>
        <button
          onClick={() => updateField({ is_accepting_orders: !restaurant.is_accepting_orders })}
          disabled={saving}
          className="w-11 h-6 rounded-full relative transition-colors disabled:opacity-50"
          style={{ background: restaurant.is_accepting_orders ? 'var(--orange)' : 'var(--line)' }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
            style={{ left: 2, transform: restaurant.is_accepting_orders ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="time"
          value={restaurant.accepting_start_time ?? ''}
          onChange={(e) => updateField({ accepting_start_time: e.target.value as any })}
          className="flex-1 px-2.5 py-2 rounded-[8px] text-[12.5px] outline-none"
          style={{ border: '1px solid var(--line)' }}
        />
        <span className="text-[12px]" style={{ color: 'var(--gray)' }}>to</span>
        <input
          type="time"
          value={restaurant.accepting_end_time ?? ''}
          onChange={(e) => updateField({ accepting_end_time: e.target.value as any })}
          className="flex-1 px-2.5 py-2 rounded-[8px] text-[12.5px] outline-none"
          style={{ border: '1px solid var(--line)' }}
        />
      </div>

      {error && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--red)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
