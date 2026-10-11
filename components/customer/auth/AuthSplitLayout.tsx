import type {ReactNode} from 'react';

interface AuthSplitLayoutProps {
  imageUrl: string;
  children: ReactNode;
}

/**
 * Two-column auth screen. Laptop: form on the left, image on the right.
 * Phone: the same image sits faded behind the form so the page stays light.
 * The image is decorative, so it's hidden from screen readers.
 */
export default function AuthSplitLayout({imageUrl, children}: AuthSplitLayoutProps) {
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        className="fixed inset-0 h-full w-full object-cover opacity-[0.13] pointer-events-none lg:hidden"
      />

      <div className="relative z-10 flex items-center justify-center">{children}</div>

      <div className="relative hidden lg:block" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    </div>
  );
}
