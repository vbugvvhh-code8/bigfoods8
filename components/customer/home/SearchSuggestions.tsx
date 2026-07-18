'use client';

import {useRouter} from 'next/navigation';

interface SearchSuggestionsProps {
  visible: boolean;
}

// Popular-search microcopy — not business data, matches the doc's own examples.
const SUGGESTIONS = ['Jollof Rice', 'Suya', 'Shawarma', 'Small Chops', 'Amala', 'Pepper Soup', 'Zobo'];

export function SearchSuggestions({visible}: SearchSuggestionsProps) {
  const router = useRouter();

  return (
    <div
      className={`overflow-hidden transition-all duration-200 ${
        visible ? 'max-h-40 opacity-100 mt-2.5' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="text-xxs uppercase tracking-wide mb-2" style={{color: 'var(--gray)'}}>
        Popular searches
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((term) => (
          <button
            key={term}
            onMouseDown={() => router.push(`/order/search?q=${encodeURIComponent(term)}`)}
            className="px-3 py-1.5 rounded-full bg-white border text-[11.5px] font-medium transition-colors"
            style={{borderColor: 'var(--line)', color: 'var(--ink)'}}
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}
