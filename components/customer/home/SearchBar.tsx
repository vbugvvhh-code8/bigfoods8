'use client';

import {useState, useEffect, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {Search} from 'lucide-react';

const CYCLING_EXAMPLES = ["Search 'Jollof rice'", "Search 'Suya'", "Search 'Zobo'", "Search 'Amala'"];
const ROTATE_MS = 2800;

interface SearchBarProps {
  onFocus?: () => void;
  onBlur?: () => void;
}

export function SearchBar({onFocus, onBlur}: SearchBarProps) {
  const [value, setValue] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const reducedMotion = useRef(false);
  const router = useRouter();

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion.current) return;

    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % CYCLING_EXAMPLES.length);
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, []);

  const submit = (query: string) => {
    if (!query.trim()) return;
    router.push(`/order/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="relative flex items-center gap-2 rounded-xl px-3 py-3" style={{background: 'var(--peach)'}}>
      <Search className="w-4 h-4 flex-shrink-0" style={{color: '#B79C82'}} />
      <div className="relative w-full">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit(value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className="w-full bg-transparent outline-none text-[13px]"
          style={{color: 'var(--ink)'}}
          aria-label="Search restaurants or dishes"
        />
        {value === '' && (
          <span
            key={placeholderIndex}
            className="pointer-events-none absolute left-0 top-0 text-[13px] bf-placeholder-fade"
            style={{color: '#B79C82'}}
          >
            {CYCLING_EXAMPLES[placeholderIndex]}
          </span>
        )}
      </div>
      <style>{`
        .bf-placeholder-fade { animation: bfPlaceholderFade 0.4s ease; }
        @keyframes bfPlaceholderFade { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .bf-placeholder-fade { animation: none; }
        }
      `}</style>
    </div>
  );
}
