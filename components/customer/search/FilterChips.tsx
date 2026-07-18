'use client';

interface FilterChipsProps {
  sortBy?: 'distance' | 'rating';
  filterUnder20Min: boolean;
  filterOpenNow: boolean;
  hasLocation: boolean;
  onSortChange: (sort: 'distance' | 'rating' | undefined) => void;
  onFilterUnder20MinChange: (value: boolean) => void;
  onFilterOpenNowChange: (value: boolean) => void;
  onRequestLocation: () => void;
}

export function FilterChips({
  sortBy,
  filterUnder20Min,
  filterOpenNow,
  hasLocation,
  onSortChange,
  onFilterUnder20MinChange,
  onFilterOpenNowChange,
  onRequestLocation,
}: FilterChipsProps) {
  const chipStyle = (active: boolean) =>
    active
      ? {background: 'var(--peach)', borderColor: 'var(--orange)', color: 'var(--orange-dark)'}
      : {borderColor: 'var(--line)', color: 'var(--gray)'};

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mb-3">
      <button
        onClick={() => (hasLocation ? onSortChange(sortBy === 'distance' ? undefined : 'distance') : onRequestLocation())}
        className="flex-shrink-0 px-3 py-1.5 rounded-full border text-[11.5px] font-medium transition-colors"
        style={chipStyle(sortBy === 'distance')}
      >
        {hasLocation ? '📍 Closest to me' : '📍 Enable location'}
      </button>
      <button
        onClick={() => onSortChange(sortBy === 'rating' ? undefined : 'rating')}
        className="flex-shrink-0 px-3 py-1.5 rounded-full border text-[11.5px] font-medium transition-colors"
        style={chipStyle(sortBy === 'rating')}
      >
        ⭐ Top rated
      </button>
      <button
        onClick={() => hasLocation && onFilterUnder20MinChange(!filterUnder20Min)}
        disabled={!hasLocation}
        className="flex-shrink-0 px-3 py-1.5 rounded-full border text-[11.5px] font-medium transition-colors disabled:opacity-50"
        style={chipStyle(filterUnder20Min)}
      >
        Under 20 min
      </button>
      <button
        onClick={() => onFilterOpenNowChange(!filterOpenNow)}
        className="flex-shrink-0 px-3 py-1.5 rounded-full border text-[11.5px] font-medium transition-colors"
        style={chipStyle(filterOpenNow)}
      >
        Open now
      </button>
    </div>
  );
}
