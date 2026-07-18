'use client';

interface CategoryChipsProps {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
}

export function CategoryChips({categories, active, onChange}: CategoryChipsProps) {
  const options = ['All', ...categories];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mt-4 scrollbar-hide">
      {options.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className="flex-shrink-0 px-3 py-1.5 rounded-full border text-[11.5px] font-medium transition-colors"
          style={
            active === cat
              ? {background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)'}
              : {borderColor: 'var(--line)', color: 'var(--gray)'}
          }
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
