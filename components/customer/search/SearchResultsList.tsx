'use client';

import type {SearchResult} from '@/hooks/useSearch';
import {RestaurantCard} from '@/components/customer/shared/RestaurantCard';
import {EmptyState} from '@/components/customer/shared/EmptyState';
import {ErrorState} from '@/components/customer/shared/ErrorState';
import {CardListSkeleton} from '@/components/customer/shared/CardListSkeleton';
import {SearchX} from 'lucide-react';

interface SearchResultsListProps {
  results: SearchResult[];
  query: string;
  isLoading: boolean;
  error: unknown;
}

export function SearchResultsList({results, query, isLoading, error}: SearchResultsListProps) {
  if (isLoading) return <CardListSkeleton />;

  if (error) return <ErrorState message="Couldn't run that search." />;

  if (results.length === 0) {
    return (
      <EmptyState
        icon={<SearchX className="w-5 h-5" />}
        title={`No results for "${query}"`}
        message="Try a different dish or restaurant name."
      />
    );
  }

  return (
    <>
      <div className="text-[11.5px] mb-3" style={{color: 'var(--gray)'}}>
        <b style={{color: 'var(--ink)'}}>{results.length}</b> result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
      </div>
      <div className="divide-y" style={{borderColor: 'var(--line)'}}>
        {results.map((r) => (
          <RestaurantCard key={r.id} restaurant={r} />
        ))}
      </div>
    </>
  );
}
