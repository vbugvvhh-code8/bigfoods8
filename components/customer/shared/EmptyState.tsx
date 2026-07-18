interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
}

export function EmptyState({title, message, icon}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      {icon && (
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{background: 'var(--peach)', color: 'var(--orange)'}}
        >
          {icon}
        </div>
      )}
      <p className="font-display font-semibold text-[14px]" style={{color: 'var(--ink)'}}>
        {title}
      </p>
      <p className="text-[12px] mt-1 max-w-[260px]" style={{color: 'var(--gray)'}}>
        {message}
      </p>
    </div>
  );
}
