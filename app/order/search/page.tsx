'use client';

import {Suspense, useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {ArrowLeft, Search} from 'lucide-react';
import {useSearch} from '@/hooks/useSearch';
import {useGeolocation} from '@/hooks/useGeolocation';
import {FilterChips} from '@/components/customer/search/FilterChips';
import {SearchResultsList} from '@/components/customer/search/SearchResultsList';
import {OrderTray} from '@/components/customer/menu/OrderTray';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [inputValue, setInputValue] = useState(query);
  const {latitude, longitude, requestLocation} = useGeolocation();

  useEffect(() => setInputValue(query), [query]);

  const {results, isLoading, error, options, setSortBy, setFilterUnder20Min, setFilterOpenNow} = useSearch(
    query,
    latitude ?? undefined,
    longitude ?? undefined
  );

  const submitEdit = () => {
    if (inputValue.trim()) router.push(`/order/search?q=${encodeURIComponent(inputValue.trim())}`);
  };

  return (
    <div className="w-full max-w-[380px] lg:max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => router.push('/order')} className="flex items-center gap-2.5 mb-4" style={{color: 'var(--gray)'}}>
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[12.5px]">Back to home</span>
      </button>

      <div className="flex items-center gap-2 rounded-xl px-3 py-3 mb-3" style={{background: 'var(--peach)'}}>
        <Search className="w-4 h-4" style={{color: '#B79C82'}} />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitEdit()}
          className="w-full bg-transparent outline-none text-[13px]"
          style={{color: 'var(--ink)'}}
        />
      </div>

      <FilterChips
        sortBy={options.sortBy}
        filterUnder20Min={!!options.filterUnder20Min}
        filterOpenNow={!!options.filterOpenNow}
        hasLocation={latitude != null && longitude != null}
        onSortChange={setSortBy}
        onFilterUnder20MinChange={setFilterUnder20Min}
        onFilterOpenNowChange={setFilterOpenNow}
        onRequestLocation={requestLocation}
      />

      <SearchResultsList results={results} query={query} isLoading={isLoading} error={error} />
      <OrderTray />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-[380px] mx-auto px-4 py-8 text-center">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
