'use client';

export default function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: 100 }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.label}: ₦${d.value.toLocaleString()}`}>
            <div
              className="w-full rounded-t-[3px]"
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: 'var(--orange)', opacity: d.value ? 1 : 0.15 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] truncate" style={{ color: 'var(--gray)' }}>
            {data.length <= 8 || i === 0 || i === data.length - 1 ? d.label.split(' ')[0] : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
