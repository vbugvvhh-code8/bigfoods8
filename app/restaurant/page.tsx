'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/layout/Footer';

const LOGO_URL =
  'https://dpioixansygkjdbphfdj.supabase.co/storage/v1/object/public/product-images/0.4568313681357089.webp';
const CHEF_URL =
  'https://dpioixansygkjdbphfdj.supabase.co/storage/v1/object/public/product-images/0.6413335176944374.webp';

const INTRO_STORAGE_KEY = 'bf_intro_seen';
const FOODS = ['🍔', '🍕', '🌮', '🍗', '🥗', '🍟', '🍩', '🥤'];

export default function RestaurantLandingPage() {
  return (
    <div style={{ background: 'var(--white)' }}>
      <IntroAnimation />

      {/* sticky header — stays put while everything else scrolls under it */}
      <header
        className="sticky top-0 z-20"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between py-3.5">
          <div className="flex items-center gap-2.5">
            <BFImage
              src={LOGO_URL}
              alt="BigFoods logo"
              className="w-[26px] h-[26px] rounded-lg object-cover flex-shrink-0"
              placeholderStyle={{ background: 'var(--peach)' }}
            />
            <span
              className="text-[14.5px] font-semibold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              BigFoods
            </span>
          </div>

          {/* On mobile this sits to the right, opposite the logo. On desktop it moves into the nav row. */}
          <span
            className="text-[10px] md:hidden"
            style={{ color: 'var(--gray)' }}
          >
            Restaurant Portal
          </span>

          <nav className="hidden md:flex items-center gap-6.5 text-[12px] font-medium">
            <span style={{ color: 'var(--gray)' }}>Restaurant Portal</span>
            <Link href="/rider-portal" style={{ color: 'var(--gray)' }} className="hover:opacity-80">
              Become a rider
            </Link>
            <Link href="/blogs" style={{ color: 'var(--gray)' }} className="hover:opacity-80">
              Blog
            </Link>
            <Link
              href="/restaurant-portal/login"
              className="px-4 py-[7px] rounded-lg font-semibold text-[12px]"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              Log in
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-[1180px] mx-auto px-6">
        {/* hero */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.1fr_1fr] gap-0 md:gap-6 lg:gap-10 items-start pt-7 md:pt-11">
          <div className="max-w-[420px] lg:max-w-[440px] text-left relative z-[2]">
            <p
              className="text-[9.5px] font-semibold uppercase tracking-wide mb-2.5"
              style={{ color: 'var(--orange)' }}
            >
              For restaurants &amp; home kitchens
            </p>
            <h1
              className="text-[25px] md:text-[30px] lg:text-[34px] leading-[1.15] font-semibold mb-2.5 text-left"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}
            >
              Cook. We handle pickup, delivery, and getting you customers.
            </h1>
            <p
              className="text-[12px] leading-[1.55] mb-0 max-w-[360px] text-left"
              style={{ color: 'var(--gray)' }}
            >
              Join BigFoods and put your kitchen in front of hungry customers across Anambra —
              no delivery staff required.
            </p>
          </div>

          <HeroVisual />
        </div>

        {/* CTA */}
        <div className="max-w-[520px] pt-6 pb-8 md:pb-9 text-left">
          <div className="flex items-center gap-4 flex-wrap mb-3">
            <Link
              href="/restaurant-portal/onboarding/restaurant-info"
              className="px-5.5 py-3 rounded-xl text-white font-semibold text-[13px] inline-block"
              style={{
                background: 'var(--orange)',
                boxShadow: '0 8px 16px -8px rgba(249,115,22,0.5)',
              }}
            >
              Register your restaurant
            </Link>
            <p className="text-[11px]" style={{ color: 'var(--gray)' }}>
              Already registered?{' '}
              <Link href="/restaurant-portal/login" className="font-semibold" style={{ color: 'var(--orange)' }}>
                Log in
              </Link>
            </p>
          </div>
          <p className="text-[10px] leading-[1.5]" style={{ color: 'var(--gray)' }}>
            By registering you agree to BigFoods'{' '}
            <Link href="/terms" className="underline" style={{ color: 'var(--ink)' }}>
              Terms &amp; Conditions
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline" style={{ color: 'var(--ink)' }}>
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* features */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-6.5 pt-1 pb-2"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <Feature
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--orange)' }} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
            title="Free dispatch, always"
            desc="A rider comes to collect and deliver every order — no setup cost, ever."
          />
          <Feature
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--orange)' }} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 21l-1-4" /><path d="M13 3l1 4" /><path d="M4 15l4-11 4 11a4 4 0 0 1-8 0z" /><path d="M12 15l4-11 4 11a4 4 0 0 1-8 0z" />
              </svg>
            }
            title="Launch already featured"
            desc="Every new kitchen goes live with a visibility boost — a head start while your first reviews come in."
          />
          <Feature
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--orange)' }} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="17" y1="7" x2="7" y2="17" /><polyline points="8 7 17 7 17 16" />
              </svg>
            }
            title="Grow with promotions"
            desc="Boosted visibility to reach more customers in your zone, whenever you need a push."
          />
        </div>
      </div>

      <Footer />

      <style jsx>{`
        @keyframes bf-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        @keyframes bf-cycle {
          0% { opacity: 0; transform: translateY(8px); }
          2% { opacity: 1; transform: translateY(0); }
          14% { opacity: 1; transform: translateY(0); }
          17% { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 0; }
        }
        :global(.bf-live-dot) { animation: bf-pulse 1.6s ease-in-out infinite; }
        :global(.bf-ticket) { animation: bf-cycle 24s infinite; }
        @media (prefers-reduced-motion: reduce) {
          :global(.bf-live-dot), :global(.bf-ticket) { animation: none !important; }
          :global(.bf-ticket) { opacity: 0; }
          :global(.bf-ticket.bf-t1) { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Image with a colored placeholder fallback so it never shows a       */
/* broken-image icon — on error it just keeps the background color.    */
/* ------------------------------------------------------------------ */
function BFImage({
  src,
  alt,
  className,
  style,
  placeholderStyle,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  placeholderStyle?: React.CSSProperties;
}) {
  const [errored, setErrored] = useState(false);

  return (
    <div className={className} style={{ ...placeholderStyle, ...style, overflow: 'hidden' }}>
      {!errored && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
          style={{ display: 'block' }}
        />
      )}
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex md:flex-col gap-3 md:gap-3 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
      <div
        className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--peach)' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[12.5px] font-semibold mb-1 text-left" style={{ color: 'var(--ink)' }}>
          {title}
        </p>
        <p className="text-[11px] leading-[1.5] text-left" style={{ color: 'var(--gray)' }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

const TICKETS = [
  { tag: 'Order ready', title: "#A192 — Mama Ngozi's Kitchen", detail: 'Dispatch rider arriving in 4 min' },
  { tag: 'New order', title: "#A203 placed — Zik's Suya Spot", detail: 'Kitchen notified instantly' },
  { tag: 'Picked up', title: "#A188 — Amara's Kitchen", detail: 'On its way to Fegge, Onitsha' },
  { tag: 'Delivered', title: '#A201 — Coal City Grills', detail: 'Customer rated 5 stars ★★★★★' },
  { tag: 'Now featured', title: "Chidi's Kitchen went live", detail: 'Boosted visibility activated' },
  { tag: 'Milestone', title: '50 orders this week', detail: "Awele's Kitchen, Awka zone" },
];

function LiveTicket() {
  return (
    <>
      {TICKETS.map((t, i) => (
        <div
          key={t.title}
          className={`bf-ticket bf-t${i + 1} absolute inset-0 rounded-[11px] p-3 flex flex-col justify-center`}
          style={{
            background: 'var(--white)',
            boxShadow: '0 6px 14px -8px rgba(25,23,20,0.16)',
            animationDelay: `${i * 4}s`,
          }}
        >
          <span
            className="inline-block w-fit text-[8.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full mb-1"
            style={{ color: 'var(--orange-dark)', background: 'var(--peach)' }}
          >
            {t.tag}
          </span>
          <b
            className="block text-[12px] mb-0.5"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}
          >
            {t.title}
          </b>
          <span className="text-[10px]" style={{ color: 'var(--gray)' }}>
            {t.detail}
          </span>
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hero visual: mobile shows the chef faded behind the live ticket in  */
/* one card. Desktop separates them — chef stands clear on the right, */
/* ticket card sits below it with more breathing room.                */
/* ------------------------------------------------------------------ */
function HeroVisual() {
  return (
    <div className="relative mt-4 md:mt-0">
      {/* mobile: blended card */}
      <div
        className="md:hidden relative rounded-[18px] overflow-hidden p-3.5"
        style={{ background: 'var(--peach)', minHeight: 168 }}
      >
        <img
          src={CHEF_URL}
          alt=""
          referrerPolicy="no-referrer"
          className="absolute pointer-events-none"
          style={{
            top: '-10%',
            right: '-6%',
            height: '130%',
            minWidth: 90,
            opacity: 0.16,
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.9) 30%, transparent 82%)',
            maskImage: 'linear-gradient(to left, rgba(0,0,0,0.9) 30%, transparent 82%)',
          }}
        />
        <div
          className="relative z-[1] inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide mb-2.5"
          style={{ color: 'var(--orange-dark)' }}
        >
          <span className="bf-live-dot w-1.5 h-1.5 rounded-full" style={{ background: 'var(--orange)' }} />
          Live on BigFoods
        </div>
        <div className="relative z-[1]" style={{ height: 82 }}>
          <LiveTicket />
        </div>
      </div>

      {/* desktop: chef clear on the right, ticket below it */}
      <div className="hidden md:flex flex-col items-end gap-5">
        <img
          src={CHEF_URL}
          alt="Chef illustration"
          referrerPolicy="no-referrer"
          className="block rounded-[14px] object-contain"
          style={{ height: 300, minWidth: 180, background: 'var(--peach)' }}
        />
        <div
          className="relative rounded-[18px] w-full p-3.5"
          style={{ background: 'var(--peach)', maxWidth: 320, minHeight: 128 }}
        >
          <div
            className="relative z-[1] inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide mb-2.5"
            style={{ color: 'var(--orange-dark)' }}
          >
            <span className="bf-live-dot w-1.5 h-1.5 rounded-full" style={{ background: 'var(--orange)' }} />
            Live on BigFoods
          </div>
          <div className="relative z-[1]" style={{ height: 82 }}>
            <LiveTicket />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One-time intro animation. Plays once per browser (localStorage-     */
/* gated), never again after that unless site data is cleared.         */
/* Sequence: logo rolls in from the left → settles + "click" bounce →  */
/* tagline fades in → food burst with splash colors → iris wipe clears */
/* it away to reveal the page. Waits for the logo image to load first  */
/* (with a timeout fallback) so slow connections still get a clean     */
/* first frame instead of a flash of a missing image.                  */
/* ------------------------------------------------------------------ */
type Particle = { tx: number; ty: number; rot: number; delay: number; food: string };
type Blob = { sx: number; sy: number; scale: number; delay: number; color: string };

function buildParticles(): { particles: Particle[]; blobs: Blob[] } {
  const particles: Particle[] = [];
  const blobs: Blob[] = [];
  const count = 10;
  const blobColors = ['#ffffff', '#fdefe4', '#191714'];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360 + (Math.random() * 18 - 9);
    const dist = 90 + Math.random() * 70;
    const rad = (angle * Math.PI) / 180;
    particles.push({
      tx: Math.cos(rad) * dist,
      ty: Math.sin(rad) * dist,
      rot: Math.random() * 240 - 120,
      delay: Math.random() * 90,
      food: FOODS[i % FOODS.length],
    });

    const bAngle = angle + (Math.random() * 24 - 12);
    const bDist = 50 + Math.random() * 50;
    const bRad = (bAngle * Math.PI) / 180;
    blobs.push({
      sx: Math.cos(bRad) * bDist,
      sy: Math.sin(bRad) * bDist,
      scale: 1.4 + Math.random() * 1.6,
      delay: Math.random() * 60,
      color: blobColors[i % blobColors.length],
    });
  }
  return { particles, blobs };
}

function IntroAnimation() {
  const [shouldRender, setShouldRender] = useState(false); // whether the intro should exist at all this load
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'clicked' | 'burst' | 'wipe' | 'hidden'>('idle');
  const [scene] = useState(buildParticles);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(INTRO_STORAGE_KEY) === 'true';
    } catch {
      // localStorage unavailable (privacy mode etc.) — just skip the intro
      seen = true;
    }
    if (seen) {
      setPhase('hidden');
      return;
    }
    setShouldRender(true);

    const img = new window.Image();
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      runTimeline();
    };
    img.onload = start;
    img.onerror = start;
    img.src = LOGO_URL;
    const fallback = setTimeout(start, 1800); // never hang on a very slow connection
    timeouts.current.push(fallback);

    return () => {
      timeouts.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runTimeline() {
    setPhase('rolling'); // 0ms
    timeouts.current.push(setTimeout(() => setPhase('clicked'), 900));
    timeouts.current.push(setTimeout(() => setPhase('burst'), 1550));
    timeouts.current.push(setTimeout(() => setPhase('wipe'), 2750));
    timeouts.current.push(
      setTimeout(() => {
        setPhase('hidden');
        try {
          window.localStorage.setItem(INTRO_STORAGE_KEY, 'true');
        } catch {
          // ignore — worst case the intro plays again next time
        }
      }, 3550)
    );
  }

  if (!shouldRender || phase === 'hidden') return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, var(--orange), var(--orange-dark))',
        animation: phase === 'wipe' ? 'bf-wipe-out 800ms cubic-bezier(.6,0,.4,1) forwards' : undefined,
      }}
    >
      <div className="flex flex-col items-center" style={{ gap: 18 }}>
        <div className="relative" style={{ width: 62, height: 62 }}>
          {/* ripple */}
          <div
            className="absolute rounded-full"
            style={{
              left: '50%',
              top: '50%',
              width: 64,
              height: 64,
              marginLeft: -32,
              marginTop: -32,
              background: 'rgba(255,255,255,0.55)',
              opacity: phase === 'clicked' || phase === 'burst' ? undefined : 0,
              animation:
                phase === 'clicked' || phase === 'burst'
                  ? 'bf-ripple 650ms cubic-bezier(.2,.8,.2,1) forwards'
                  : undefined,
            }}
          />
          {/* logo */}
          <img
            src={LOGO_URL}
            alt=""
            referrerPolicy="no-referrer"
            className="relative rounded-full object-cover"
            style={{
              width: 62,
              height: 62,
              background: 'var(--peach)',
              boxShadow: '0 10px 26px -8px rgba(0,0,0,0.45)',
              opacity: phase === 'idle' ? 0 : undefined,
              transform: phase === 'idle' ? 'translateX(-70vw) rotate(-120deg) scale(0.7)' : undefined,
              animation:
                phase === 'rolling'
                  ? 'bf-roll-in 900ms cubic-bezier(.16,.84,.44,1) forwards'
                  : phase === 'clicked'
                  ? 'bf-click-bounce 500ms ease-in-out'
                  : undefined,
            }}
          />
          {/* food burst + splashes */}
          {(phase === 'burst' || phase === 'wipe') &&
            scene.particles.map((p, i) => (
              <span
                key={`p-${i}`}
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  fontSize: 22,
                  animationDelay: `${p.delay}ms`,
                  animation: 'bf-burst 950ms cubic-bezier(.18,.7,.3,1) forwards',
                  ['--tx' as any]: `${p.tx}px`,
                  ['--ty' as any]: `${p.ty}px`,
                  ['--rot' as any]: `${p.rot}deg`,
                }}
              >
                {p.food}
              </span>
            ))}
          {(phase === 'burst' || phase === 'wipe') &&
            scene.blobs.map((b, i) => (
              <span
                key={`b-${i}`}
                className="absolute rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  width: 16,
                  height: 16,
                  background: b.color,
                  animationDelay: `${b.delay}ms`,
                  animation: 'bf-splash 850ms ease-out forwards',
                  ['--sx' as any]: `${b.sx}px`,
                  ['--sy' as any]: `${b.sy}px`,
                  ['--sscale' as any]: b.scale,
                }}
              />
            ))}
        </div>

        <div
          className="text-center font-semibold"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15,
            letterSpacing: '-0.01em',
            color: '#ffffff',
            maxWidth: 220,
            opacity: phase === 'idle' || phase === 'rolling' ? 0 : undefined,
            transform: phase === 'idle' || phase === 'rolling' ? 'translateY(6px)' : undefined,
            animation:
              phase === 'clicked' || phase === 'burst' || phase === 'wipe'
                ? 'bf-tagline-in 550ms ease forwards'
                : undefined,
          }}
        >
          Sell your food across Anambra
        </div>
      </div>

      <style jsx>{`
        @keyframes bf-tagline-in {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes bf-roll-in {
          0% { opacity: 0; transform: translateX(-70vw) rotate(-120deg) scale(0.7); }
          70% { opacity: 1; transform: translateX(6px) rotate(8deg) scale(1.04); }
          100% { opacity: 1; transform: translateX(0) rotate(0deg) scale(1); }
        }
        @keyframes bf-click-bounce {
          0% { transform: scale(1); }
          35% { transform: scale(0.86); }
          65% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        @keyframes bf-ripple {
          0% { opacity: 0.55; transform: scale(0.4); }
          100% { opacity: 0; transform: scale(4.2); }
        }
        @keyframes bf-burst {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(0deg); }
          18% { opacity: 1; }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1) rotate(var(--rot));
          }
        }
        @keyframes bf-splash {
          0% { opacity: 0.9; transform: translate(-50%, -50%) scale(0); }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--sx)), calc(-50% + var(--sy))) scale(var(--sscale));
          }
        }
        @keyframes bf-wipe-out {
          0% { clip-path: circle(150% at 50% 50%); }
          100% { clip-path: circle(0% at 50% 50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          div { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
