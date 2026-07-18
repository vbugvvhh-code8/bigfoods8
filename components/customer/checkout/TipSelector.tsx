'use client';

const PRESETS = [0, 200, 500, 1000];

interface TipSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function TipSelector({value, onChange}: TipSelectorProps) {
  return (
    <div className="mt-4">
      <div className="font-semibold text-[12.5px] mb-2" style={{color: 'var(--ink)'}}>
        Tip your rider
      </div>
      <div className="flex gap-2">
        {PRESETS.map((amount) => (
          <button
            key={amount}
            onClick={() => onChange(amount)}
            className="flex-1 py-2 rounded-lg border text-[12px] font-semibold transition-colors"
            style={
              value === amount
                ? {background: 'var(--peach)', borderColor: 'var(--orange)', color: 'var(--orange-dark)'}
                : {borderColor: 'var(--line)', color: 'var(--gray)'}
            }
          >
            {amount === 0 ? 'No tip' : `₦${amount}`}
          </button>
        ))}
      </div>
    </div>
  );
}
