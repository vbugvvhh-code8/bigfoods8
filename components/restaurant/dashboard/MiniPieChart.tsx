'use client';

const COLORS = ['#FF6A00', '#E85D00', '#F9A65A', '#FBC490', '#D8D2CB'];

export default function MiniPieChart({ data }: { data: { name: string; quantity: number }[] }) {
  const top = data.slice(0, 4);
  const otherTotal = data.slice(4).reduce((s, d) => s + d.quantity, 0);
  const slices = otherTotal > 0 ? [...top, { name: 'Other', quantity: otherTotal }] : top;
  const total = slices.reduce((s, d) => s + d.quantity, 0);

  if (slices.length === 0 || total === 0) {
    return (
      <p className="text-[11.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        No sales yet for this period.
      </p>
    );
  }

  let cumulative = 0;
  const stops = slices.map((s, i) => {
    const start = (cumulative / total) * 360;
    cumulative += s.quantity;
    const end = (cumulative / total) * 360;
    return `${COLORS[i % COLORS.length]} ${start}deg ${end}deg`;
  });

  return (
    <div className="flex items-center gap-4">
      <div
        className="rounded-full flex-shrink-0"
        style={{ width: 84, height: 84, background: `conic-gradient(${stops.join(', ')})` }}
      />
      <div className="flex-1 space-y-1.5 min-w-0">
        {slices.map((s, i) => (
          <div key={s.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-[11px] truncate" style={{ color: 'var(--ink)' }}>{s.name}</span>
            </div>
            <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--gray)' }}>
              {Math.round((s.quantity / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
