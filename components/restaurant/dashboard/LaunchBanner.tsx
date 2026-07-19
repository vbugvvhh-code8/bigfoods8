'use client';

export default function LaunchBanner() {
  return (
    <div className="p-3 rounded-[10px] flex items-center gap-2" style={{ background: 'var(--ink)' }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--orange)' }} />
      <p className="text-[11.5px]" style={{ color: 'white' }}>
        BigFoods launches Sept 30, 2026 — make sure your menu and hours are ready.
      </p>
    </div>
  );
}
