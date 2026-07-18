export function CardListSkeleton({rows = 4}: {rows?: number}) {
  return (
    <div className="divide-y" style={{borderColor: 'var(--line)'}}>
      {Array.from({length: rows}).map((_, i) => (
        <div key={i} className="flex gap-3 items-center py-3">
          <div className="w-14 h-14 rounded-[10px] animate-pulse" style={{background: 'var(--peach)'}} />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded animate-pulse" style={{background: 'var(--peach)'}} />
            <div className="h-2.5 w-1/2 rounded animate-pulse" style={{background: 'var(--peach)'}} />
          </div>
        </div>
      ))}
    </div>
  );
}
