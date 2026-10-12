'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  style?: CSSProperties;
  /** Shown when there is no src or the image fails to load. Defaults to a soft orange tile. */
  fallback?: ReactNode;
  /** Decorative images (alt="") are hidden from screen readers. */
  loading?: 'lazy' | 'eager';
}

/**
 * An image that never shows a broken-image icon: if the URL is missing or fails
 * to load, a neutral placeholder tile is shown instead.
 */
export default function SafeImage({ src, alt, className, style, fallback, loading = 'lazy' }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // A new src gets a fresh chance to load.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  // An image can fail before React attaches onError (server-rendered page),
  // so check once after mount too.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={className}
        style={{ background: 'linear-gradient(135deg, var(--peach), #FFD9B8)', ...style }}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      >
        {fallback}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={className}
      style={style}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}
