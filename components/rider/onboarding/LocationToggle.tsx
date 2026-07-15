'use client';

interface LocationToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export default function LocationToggle({ enabled, onChange }: LocationToggleProps) {
  return (
    <>
      <div
        className="flex items-center justify-between rounded-[10px] px-3.5 py-3 mb-3.5"
        style={{ border: '1px solid var(--line)' }}
      >
        <div>
          <p className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>Location access</p>
          <p className="text-[11px]" style={{ color: 'var(--gray)' }}>Checked every 5 minutes while online</p>
        </div>
        <button
          onClick={() => onChange(!enabled)}
          className="w-[42px] h-6 rounded-full relative transition-colors flex-shrink-0"
          style={{ background: enabled ? 'var(--orange)' : 'var(--line)' }}
        >
          <span
            className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all"
            style={{ left: enabled ? '21px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
          />
        </button>
      </div>

      <div className="rounded-[10px] p-3.5 mb-5" style={{ background: 'var(--peach)' }}>
        <div className="text-[12px] font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--orange)' }} />
          You&apos;re in control
        </div>
        <p className="text-[11.5px]" style={{ color: '#6E5A46', lineHeight: 1.6 }}>
          Location is only used to match you with nearby orders. You can change or turn this off anytime from your settings.
        </p>
      </div>
    </>
  );
}
