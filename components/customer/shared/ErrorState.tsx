interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({message = "Something didn't load right.", onRetry}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <p className="font-display font-semibold text-[14px]" style={{color: 'var(--ink)'}}>
        {message}
      </p>
      <p className="text-[12px] mt-1" style={{color: 'var(--gray)'}}>
        Check your connection and try again.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-2 rounded-full text-[12px] font-semibold text-white"
          style={{background: 'var(--orange)'}}
        >
          Retry
        </button>
      )}
    </div>
  );
}
