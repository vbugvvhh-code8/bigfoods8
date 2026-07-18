'use client';

interface MenuCategoryTabsProps {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
}

export function MenuCategoryTabs({categories, active, onChange}: MenuCategoryTabsProps) {
  const tabs = ['All', ...categories];

  return (
    <div
      className="flex gap-4 overflow-x-auto mb-3 scrollbar-hide border-b pb-2"
      style={{borderColor: 'var(--line)'}}
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className="flex-shrink-0 text-[12px] font-semibold px-1 pb-1 border-b-2 transition-colors"
          style={
            active === tab
              ? {color: 'var(--ink)', borderColor: 'var(--orange)'}
              : {color: 'var(--gray)', borderColor: 'transparent'}
          }
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
