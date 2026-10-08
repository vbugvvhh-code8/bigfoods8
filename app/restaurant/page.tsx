'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/layout/Footer';

const BASE = 'https://dpioixansygkjdbphfdj.supabase.co/storage/v1/object/public/product-images/';
const LOGO_URL = `${BASE}0.4568313681357089.webp`;
const CHEF_URL = `${BASE}0.6413335176944374.webp`;
const MASCOT_URL = `${BASE}0.589270104135831.webp`;

const PARTNERS = [
  { id: '0.014563627963848691', name: 'Partner 1' },
  { id: '0.1874883265404469', name: 'Partner 2' },
  { id: '0.4816492739615813', name: 'Partner 3' },
  { id: '0.09280120305804185', name: 'Partner 4' },
  { id: '0.564685659210951', name: 'Partner 5' },
].map((p) => ({ ...p, src: `${BASE}${p.id}.webp` }));

const HEADING_FONT = { fontFamily: "'Space Grotesk', sans-serif" };

export default function RestaurantLandingPage() {
  return (
    <div className="min-h-screen flex flex-col text-left" style={{ background: 'var(--white)' }}>
      <WelcomeModal />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg"
        style={{ background: 'var(--ink)', color: '#fff' }}
      >
        Skip to content
      </a>

      <header
        className="sticky top-0 z-20"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="max-w-[1180px] mx-auto px-5 sm:px-6 flex items-center justify-between h-14">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ outlineColor: 'var(--orange)' }}
          >
            <BFImage
              src={LOGO_URL}
              alt=""
              className="w-7 h-7 rounded-lg flex-shrink-0"
              placeholderStyle={{ background: 'var(--peach)' }}
            />
            <span className="text-[15px] font-semibold" style={{ ...HEADING_FONT, color: 'var(--ink)' }}>
              BigFoods
            </span>
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-4 sm:gap-6 text-[13px] font-medium">
            <Link href="/rider-portal" className="hidden sm:inline hover:opacity-70 transition-opacity" style={{ color: 'var(--gray)' }}>
              Become a rider
            </Link>
            <Link href="/blogs" className="hidden sm:inline hover:opacity-70 transition-opacity" style={{ color: 'var(--gray)' }}>
              Blog
            </Link>
            <Link
              href="/restaurant-portal/login"
              className="px-4 py-2 rounded-lg font-semibold transition-colors hover:bg-black/5"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              Log in
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="max-w-[1180px] mx-auto px-5 sm:px-6 pt-8 sm:pt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="max-w-[560px]">
            <h1
              className="text-[30px] sm:text-[40px] lg:text-[50px] leading-[1.1] font-semibold"
              style={{ ...HEADING_FONT, color: 'var(--ink)', letterSpacing: '-0.02em', textWrap: 'balance' as any }}
            >
              Cook, bake, fry. We pick up from you and deliver to clients.
            </h1>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <Link
                href="/restaurant-portal/onboarding/restaurant-info"
                className="px-7 py-3.5 rounded-xl text-white font-semibold text-[14px] text-center transition-transform active:scale-[0.98] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: 'var(--orange)',
                  boxShadow: '0 10px 20px -10px rgba(249,115,22,0.55)',
                  outlineColor: 'var(--orange)',
                }}
              >
                Register your kitchen
              </Link>
              <p className="text-[13px]" style={{ color: 'var(--gray)' }}>
                Already registered?{' '}
                <Link href="/restaurant-portal/login" className="font-semibold underline-offset-4 hover:underline" style={{ color: 'var(--orange)' }}>
                  Log in
                </Link>
              </p>
            </div>
          </div>

          {/* chef: the main image */}
          <div className="relative flex justify-start lg:justify-center">
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-0 lg:left-1/2 lg:-translate-x-1/2 w-[min(92%,480px)] h-[62%] rounded-[28px]"
              style={{ background: 'var(--peach)' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CHEF_URL}
              alt="Illustration of a chef presenting a dish"
              width={600}
              height={600}
              fetchPriority="high"
              decoding="async"
              referrerPolicy="no-referrer"
              className="relative block object-contain w-auto max-w-full"
              style={{ height: 'clamp(260px, 44vh, 460px)' }}
            />
          </div>
        </section>

        {/* partners marquee */}
        <section aria-label="Our partners" className="mt-10 sm:mt-14 pb-12 sm:pb-16">
          <p className="max-w-[1180px] mx-auto px-5 sm:px-6 text-[12px] mb-4" style={{ color: 'var(--gray)' }}>
            Trusted by our partners
          </p>

          <div className="bf-marquee relative overflow-hidden">
            <div className="bf-track flex w-max items-center">
              {[0, 1].map((copy) => (
                <ul
                  key={copy}
                  className="flex items-center gap-10 sm:gap-14 pr-10 sm:pr-14 flex-shrink-0 m-0 p-0 list-none"
                  aria-hidden={copy === 1 ? 'true' : undefined}
                >
                  {PARTNERS.map((p) => (
                    <li key={`${copy}-${p.id}`} className="flex-shrink-0">
                      <PartnerLogo src={p.src} name={p.name} hidden={copy === 1} />
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx>{`
        .bf-marquee {
          -webkit-mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
          mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
        }
        /* slides left to right */
        .bf-track {
          animation: bf-slide 28s linear infinite;
          will-change: transform;
        }
        .bf-marquee:hover .bf-track {
          animation-play-state: paused;
        }
        @keyframes bf-slide {
          from { transform: translate3d(-50%, 0, 0); }
          to   { transform: translate3d(0, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bf-track {
            animation: none;
            transform: none;
            width: 100%;
            flex-wrap: wrap;
          }
          .bf-track > ul:nth-child(2) { display: none; }
          .bf-marquee {
            -webkit-mask-image: none;
            mask-image: none;
          }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Welcome modal: opens on mount, closable via X, "Got it", backdrop,  */
/* or Escape. Traps focus, locks page scroll, restores focus on close. */
/* ------------------------------------------------------------------ */
function WelcomeModal() {
  const [open, setOpen] = useState(true);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => setOpen(false), 180);
  }, []);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className={`bf-overlay fixed inset-0 z-[999] flex items-center justify-center p-4 ${closing ? 'bf-out' : ''}`}
      style={{ background: 'rgba(25,23,20,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bf-welcome-title"
        aria-describedby="bf-welcome-desc"
        className="bf-card relative w-full max-w-[440px] max-h-[92dvh] overflow-y-auto rounded-[28px] text-left"
        style={{ background: 'var(--white)', boxShadow: '0 30px 80px -20px rgba(25,23,20,0.45)' }}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: 'rgba(255,255,255,0.8)', color: 'var(--ink)', outlineColor: 'var(--orange)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>

        <div
          className="flex justify-center pt-6 px-6"
          style={{ background: 'linear-gradient(180deg, var(--peach), rgba(255,255,255,0))' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MASCOT_URL}
            alt="BigFoods AI, an orange robot chef mascot"
            width={1254}
            height={1254}
            fetchPriority="high"
            decoding="async"
            referrerPolicy="no-referrer"
            className="bf-mascot block object-contain"
            style={{ width: 'min(72vw, 320px)', maxHeight: '38dvh', height: 'auto' }}
          />
        </div>

        <div className="bf-copy px-6 pb-6 pt-2">
          <div className="pl-4" style={{ borderLeft: '3px solid var(--orange)' }}>
            <h2
              id="bf-welcome-title"
              className="text-[18px] sm:text-[20px] font-semibold leading-snug"
              style={{ ...HEADING_FONT, color: 'var(--ink)' }}
            >
              Hey, I&apos;m the BigFoods AI, and we&apos;re about to make history.
            </h2>
            <p id="bf-welcome-desc" className="mt-2 text-[13px] sm:text-[14px] leading-[1.6]" style={{ color: 'var(--gray)' }}>
              We won&apos;t leave you hanging after you register. The key is to fulfill your orders early
              enough to keep your food shop from getting closed, ok?
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            className="mt-5 w-full sm:w-auto px-7 py-3 rounded-xl text-white font-semibold text-[14px] transition-transform active:scale-[0.98] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: 'var(--orange)',
              boxShadow: '0 10px 20px -10px rgba(249,115,22,0.55)',
              outlineColor: 'var(--orange)',
            }}
          >
            Got it
          </button>
        </div>
      </div>

      <style jsx>{`
        .bf-overlay { animation: bf-overlay-in 200ms ease-out both; }
        .bf-overlay.bf-out { animation: bf-overlay-out 180ms ease-in forwards; }
        .bf-card { animation: bf-card-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        .bf-out .bf-card { animation: bf-card-out 180ms ease-in forwards; }

        /* mascot bounces in just after the card appears */
        .bf-mascot {
          opacity: 0;
          transform-origin: 50% 90%;
          animation: bf-pop 900ms cubic-bezier(0.34, 1.4, 0.5, 1) 200ms forwards;
        }
        .bf-copy { opacity: 0; animation: bf-fade 450ms ease-out 750ms forwards; }

        @keyframes bf-overlay-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bf-overlay-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes bf-card-in  { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }
        @keyframes bf-card-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(10px) scale(0.98); } }
        @keyframes bf-pop {
          0%   { opacity: 0; transform: translateY(48px) scale(0.55); }
          45%  { opacity: 1; transform: translateY(-20px) scale(1.06); }
          65%  { transform: translateY(6px) scale(0.98); }
          82%  { transform: translateY(-4px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bf-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .bf-overlay, .bf-card, .bf-out .bf-card { animation: none; }
          .bf-mascot, .bf-copy { animation: none; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* Partner logo: small, crisp, and hides itself cleanly if it fails to load. */
function PartnerLogo({ src, name, hidden }: { src: string; name: string; hidden?: boolean }) {
  const [errored, setErrored] = useState(false);
  if (errored) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={hidden ? '' : name}
      height={36}
      loading="lazy"
      decoding="async"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className="block h-7 sm:h-9 w-auto max-w-[110px] sm:max-w-[140px] object-contain select-none"
    />
  );
}

/* Image with a colored placeholder so a failed load never shows a broken icon. */
function BFImage({
  src,
  alt,
  className,
  placeholderStyle,
}: {
  src: string;
  alt: string;
  className?: string;
  placeholderStyle?: React.CSSProperties;
}) {
  const [errored, setErrored] = useState(false);
  return (
    <div className={className} style={{ ...placeholderStyle, overflow: 'hidden' }}>
      {!errored && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setErrored(true)}
          className="w-full h-full object-cover block"
        />
      )}
    </div>
  );
}
