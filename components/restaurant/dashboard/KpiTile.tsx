'use client';

export default function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-3 rounded-[10px]" style={{ border: '1px solid var(--line)', background: 'var(--white)' }}>
      <p className="text-[10px] uppercase tracking-wide mb-1 truncate" style={{ color: 'var(--gray)' }}>
        {label}
      </p>
      <p className="text-[16px] font-semibold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}>
        {value}
      </p>
      {sub && (
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--gray)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}
