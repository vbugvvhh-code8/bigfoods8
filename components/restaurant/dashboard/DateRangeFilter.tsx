'use client';

import type { DateRange } from '@/hooks/useRestaurantAnalytics';

const OPTIONS: { id: DateRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7d' },
  { id: '14d', label: '14d' },
  { id: '30d', label: '30d' },
];

export default function DateRangeFilter({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  return (
    <div className="flex gap-1 p-0.5 rounded-[8px]" style={{ background: 'var(--peach)' }}>
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className="px-2.5 py-1 rounded-[6px] text-[10.5px] font-semibold"
          style={value === o.id ? { background: 'var(--white)', color: 'var(--ink)' } : { color: 'var(--gray)' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
