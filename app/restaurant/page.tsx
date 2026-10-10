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
const WRAP = 'max-w-[1240px] mx-auto px-5 sm:px-8 lg:px-12';

/* ------------------------------------------------------------------ */
/* Small shared hooks                                                  */
/* ------------------------------------------------------------------ */
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const PlayIcon = () => (
  <svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" aria-hidden="true">
    <path d="M3 1.5v9l7-4.5z" />
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" aria-hidden="true">
    <rect x="2" y="1" width="3" height="10" rx="1" />
    <rect x="7" y="1" width="3" height="10" rx="1" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
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
        <div className={`${WRAP} flex items-center justify-between h-14`}>
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

          <nav aria-label="Primary" className="flex items-center gap-4 sm:gap-6 lg:gap-8 text-[13px] font-medium">
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
        <Hero />
        <Partners />
        <LivePreview />
        <HowItWorks />
      </main>

      <Footer />

      <style jsx global>{`
        /* ---------- hero ---------- */
        .bf-rotor { display: grid; }
        .bf-slide {
          grid-area: 1 / 1;
          opacity: 0;
          visibility: hidden;
          transform: translateY(12px);
          transition: opacity .5s ease, transform .5s ease, visibility 0s linear .5s;
        }
        .bf-slide.is-active {
          opacity: 1;
          visibility: visible;
          transform: none;
          transition: opacity .5s ease .1s, transform .5s ease .1s, visibility 0s;
        }
        .bf-h1 {
          margin: 0;
          font-weight: 600;
          font-size: clamp(29px, 6.6vw, 44px);
          line-height: 1.1;
          letter-spacing: -0.02em;
          text-wrap: balance;
          color: var(--ink);
        }
        .bf-sub {
          margin: 14px 0 0;
          color: var(--gray);
          font-size: clamp(14.5px, 2.2vw, 17px);
          line-height: 1.55;
          max-width: 46ch;
        }
        @media (min-width: 1024px) {
          .bf-h1 { font-size: clamp(44px, 4.3vw, 60px); }
          .bf-sub { font-size: 18px; }
        }
        .bf-ctrl { display: flex; align-items: center; gap: 4px; margin-top: 20px; }
        .bf-dot { width: 34px; height: 28px; display: grid; place-items: center; background: none; border: 0; padding: 0; cursor: pointer; }
        .bf-dot-bar { position: relative; display: block; overflow: hidden; width: 28px; height: 4px; border-radius: 2px; background: var(--line); }
        .bf-dot-fill, .bf-bar-fill {
          position: absolute; inset: 0; background: var(--orange);
          transform: scaleX(0); transform-origin: left;
          animation-name: bf-fill; animation-timing-function: linear; animation-fill-mode: forwards;
        }
        .bf-pbtn {
          margin-left: 8px; width: 30px; height: 30px; border-radius: 50%;
          border: 1px solid var(--line); background: var(--white); color: var(--ink);
          display: grid; place-items: center; cursor: pointer;
        }

        /* ---------- partners ---------- */
        .bf-marquee {
          overflow: hidden; max-width: 1240px; margin-inline: auto;
          -webkit-mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
          mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
        }
        .bf-track { display: flex; width: max-content; align-items: center; animation: bf-marq 28s linear infinite; will-change: transform; }
        .bf-marquee:hover .bf-track { animation-play-state: paused; }
        .bf-track ul { display: flex; align-items: center; gap: 44px; padding: 0 44px 0 0; margin: 0; list-style: none; flex-shrink: 0; }
        @media (min-width: 640px) { .bf-track ul { gap: 60px; padding-right: 60px; } }

        /* ---------- live preview ---------- */
        .bf-chip { display: inline-block; font-size: 11px; font-weight: 700; line-height: 1; letter-spacing: .04em; text-transform: uppercase; padding: 6px 9px; border-radius: 999px; background: var(--peach); color: var(--orange-dark); }
        .bf-live-grid { display: grid; gap: 16px; grid-template-areas: "wallet" "subs" "feed"; }
        @media (min-width: 1024px) {
          .bf-live-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); grid-template-rows: auto 1fr; gap: 20px; grid-template-areas: "wallet feed" "subs feed"; }
        }
        .bf-a-wallet { grid-area: wallet; }
        .bf-a-subs { grid-area: subs; display: flex; flex-direction: column; justify-content: center; }
        .bf-a-feed { grid-area: feed; display: flex; flex-direction: column; }
        .bf-card { background: var(--white); border: 1px solid var(--line); border-radius: 20px; padding: 20px; min-width: 0; }
        @media (min-width: 1024px) { .bf-card { padding: 26px; } }
        .bf-card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .bf-card-top h3 { margin: 0; font-size: 13px; font-weight: 600; color: var(--gray); }
        .bf-bal { margin: 0; font-weight: 700; font-size: clamp(34px, 8vw, 44px); letter-spacing: -.03em; line-height: 1; font-variant-numeric: tabular-nums; color: var(--ink); }
        .bf-payrow { display: flex; align-items: center; height: 56px; margin-top: 14px; padding: 0 14px; border-radius: 12px; background: #e3f4ea; color: #16794c; font-size: 13px; font-weight: 600; }
        .bf-payrow span, .bf-riders span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
        .bf-subs-row { display: flex; align-items: center; gap: 14px; }
        .bf-subs-n { margin: 0; min-width: 2ch; font-weight: 700; font-size: 34px; letter-spacing: -.03em; font-variant-numeric: tabular-nums; color: var(--ink); }
        .bf-avatars { display: flex; width: 118px; flex-shrink: 0; }
        .bf-av { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 600; background: var(--peach); color: var(--orange-dark); border: 2px solid var(--white); margin-left: -8px; }
        .bf-av:first-child { margin-left: 0; }
        .bf-av.is-new { animation: bf-popav .5s cubic-bezier(.3, 1.5, .5, 1); }
        .bf-live-dot { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--orange-dark); }
        .bf-live-dot::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--orange); animation: bf-pulse2 1.6s ease-in-out infinite; }
        .bf-feed { position: relative; height: 280px; overflow: hidden; }
        .bf-feed ul { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
        .bf-feed ul.is-moving { animation: bf-feedin .45s cubic-bezier(.2, .8, .2, 1); }
        .bf-feed li { height: 64px; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 0 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--white); }
        .bf-feed li.is-new { animation: bf-flash .8s ease; }
        .bf-f-t { margin: 0; font-weight: 600; font-size: 14px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bf-f-m { margin: 2px 0 0; font-size: 12px; color: var(--gray); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bf-f-r { display: grid; justify-items: end; gap: 4px; }
        .bf-f-time { font-size: 11px; color: var(--gray); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .bf-pill { font-size: 10.5px; font-weight: 700; line-height: 1; letter-spacing: .04em; text-transform: uppercase; padding: 5px 8px; border-radius: 999px; white-space: nowrap; }
        .bf-pill.urgent { background: #fde8e6; color: #b42318; }
        .bf-pill.now { background: var(--orange-dark); color: #fff; }
        .bf-pill.today { background: #fdf0d9; color: #9a5b06; }
        .bf-pill.tomorrow { background: var(--line); color: var(--gray); }
        .bf-pill.picked { background: #e3f4ea; color: #16794c; }
        .bf-riders { display: flex; align-items: center; margin-top: auto; padding-top: 14px; height: 58px; font-size: 13px; color: var(--gray); }
        .bf-riders b { color: var(--ink); font-weight: 600; }
        .bf-flash { animation: bf-flash .7s ease; }

        /* ---------- how it works ---------- */
        .bf-how-grid { display: grid; gap: 16px; grid-template-areas: "head" "rail" "stage" "foot"; }
        .bf-how-head { grid-area: head; margin-bottom: 8px; }
        .bf-rail { grid-area: rail; display: flex; gap: 8px; }
        .bf-stage { grid-area: stage; }
        .bf-how-foot { grid-area: foot; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px 20px; }
        @media (min-width: 1024px) {
          .bf-how-grid { grid-template-columns: minmax(300px, .8fr) minmax(0, 1.6fr); grid-template-rows: auto auto 1fr; column-gap: clamp(40px, 5vw, 80px); row-gap: 28px; grid-template-areas: "head stage" "rail stage" "foot stage"; }
          .bf-how-head { margin-bottom: 0; }
          .bf-rail { flex-direction: column; gap: 18px; }
          .bf-rail .bf-lbl { display: block; order: -1; font-size: 15px; }
          .bf-how-foot { align-self: end; flex-direction: column; align-items: flex-start; gap: 20px; }
          .bf-stage { min-height: 480px; align-content: center; }
        }
        .bf-rail button { flex: 1; min-width: 0; display: grid; gap: 8px; padding: 0; background: none; border: 0; cursor: pointer; text-align: left; color: #857c72; }
        .bf-rail button.on { color: var(--ink); }
        .bf-bar { display: block; position: relative; overflow: hidden; height: 4px; border-radius: 2px; background: var(--line); }
        .bf-rail button.done .bf-bar::after { content: ""; position: absolute; inset: 0; background: var(--orange); }
        .bf-lbl { display: none; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (min-width: 700px) { .bf-lbl { display: block; } }
        .bf-stage { position: relative; display: grid; overflow: hidden; border-radius: 28px; background: var(--peach); padding: clamp(22px, 4vw, 56px); }
        .bf-step { position: relative; grid-area: 1 / 1; min-width: 0; opacity: 0; visibility: hidden; transform: translateX(-56px); transition: opacity .5s ease, transform .5s cubic-bezier(.2, .8, .2, 1), visibility 0s linear .5s; }
        .bf-step.is-out { transform: translateX(56px); }
        .bf-step.is-active { opacity: 1; visibility: visible; transform: none; transition: opacity .5s ease, transform .5s cubic-bezier(.2, .8, .2, 1), visibility 0s; }
        .bf-step > * { position: relative; z-index: 1; }
        .bf-step::after { content: attr(data-n); position: absolute; right: -.04em; bottom: -.2em; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: clamp(140px, 22vw, 280px); line-height: 1; color: var(--orange); opacity: .13; pointer-events: none; }
        .bf-step-n { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--orange-dark); }
        .bf-step h3 { margin: 12px 0 0; font-weight: 600; font-size: clamp(24px, 5vw, 38px); line-height: 1.1; letter-spacing: -.02em; text-wrap: balance; max-width: 18ch; color: var(--ink); }
        .bf-step p.bf-step-body { margin: 12px 0 0; color: var(--gray); max-width: 50ch; font-size: clamp(14.5px, 2.2vw, 16.5px); line-height: 1.55; }
        .bf-ex { display: inline-flex; margin: 20px 0 0; padding: 10px 14px; border-radius: 12px; background: var(--white); border: 1px solid var(--line); font-size: 13px; font-weight: 600; color: var(--ink); max-width: 100%; }
        .bf-rule { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--gray); max-width: 52ch; }
        .bf-rule b { color: var(--ink); }
        .bf-arrows { display: flex; gap: 8px; }
        .bf-arrows button { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line); background: var(--white); color: var(--ink); display: grid; place-items: center; cursor: pointer; }
        .bf-arrows svg.chev { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }

        @keyframes bf-fill { to { transform: scaleX(1); } }
        @keyframes bf-marq { from { transform: translate3d(-50%, 0, 0); } to { transform: translate3d(0, 0, 0); } }
        @keyframes bf-pulse2 { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(.75); } }
        @keyframes bf-flash { 0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, .45); } 100% { box-shadow: 0 0 0 12px rgba(249, 115, 22, 0); } }
        @keyframes bf-popav { 0% { transform: scale(0); } 100% { transform: scale(1); } }
        @keyframes bf-feedin { from { transform: translateY(-72px); } to { transform: translateY(0); } }

        @media (prefers-reduced-motion: reduce) {
          .bf-slide, .bf-step { transition: none; }
          .bf-dot-fill, .bf-bar-fill { animation: none; transform: scaleX(1); }
          .bf-live-dot::before, .bf-payrow, .bf-feed ul, .bf-feed li, .bf-av { animation: none !important; }
          .bf-track { animation: none; transform: none; width: 100%; flex-wrap: wrap; }
          .bf-track > ul:nth-child(2) { display: none; }
          .bf-marquee { -webkit-mask-image: none; mask-image: none; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: rotating message in a fixed frame. All slides share one grid  */
/* cell, so the frame is always as tall as the longest message and     */
/* nothing below it moves when the text changes.                       */
/* ------------------------------------------------------------------ */
const HERO_SLIDES = [
  {
    title: 'Home kitchens accepted. No physical address, we got you covered.',
    body: "You don't need a shop, a rented space or a signboard. Cook from your own kitchen and we handle pickup, delivery and finding you customers.",
  },
  {
    title: 'Monthly subscription earnings.',
    body: 'Customers subscribe to your kitchen for the items they want and pay every month, so your income stops depending on who walks in.',
  },
  {
    title: 'Cook, bake, fry. We pick up from you and deliver to clients.',
    body: 'Your customers never leave home and you never hire a rider.',
  },
  {
    title: 'Whatever you sell, we deliver it.',
    body: 'Bakery, snacks, small chops, drinks, bottled water. If it can be packed, it can be subscribed to.',
  },
];
const HERO_MS = 6000;

function HeroRotor() {
  const reduce = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hold, setHold] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const paused = userPaused || hold || reduce;

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % HERO_SLIDES.length), HERO_MS);
    return () => clearTimeout(t);
  }, [idx, paused, epoch]);

  const restart = () => setEpoch((e) => e + 1);

  return (
    <div
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHold(true)}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') {
          setHold(false);
          restart();
        }
      }}
      onFocus={() => setHold(true)}
      onBlur={() => {
        setHold(false);
        restart();
      }}
    >
      <div className="bf-rotor" role="group" aria-roledescription="carousel" aria-label="What BigFoods offers">
        {HERO_SLIDES.map((s, i) => (
          <div
            key={s.title}
            className={`bf-slide ${i === idx ? 'is-active' : ''}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${HERO_SLIDES.length}`}
            aria-hidden={i === idx ? undefined : true}
          >
            <h1 className="bf-h1" style={HEADING_FONT}>
              {s.title}
            </h1>
            <p className="bf-sub">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="bf-ctrl">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            className="bf-dot"
            aria-label={`Show message ${i + 1} of ${HERO_SLIDES.length}`}
            aria-current={i === idx ? 'true' : undefined}
            onClick={() => {
              setIdx(i);
              restart();
            }}
          >
            <span className="bf-dot-bar">
              {i === idx && (
                <span
                  key={`${idx}-${epoch}`}
                  className="bf-dot-fill"
                  style={{ animationDuration: `${HERO_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                />
              )}
            </span>
          </button>
        ))}
        {!reduce && (
          <button
            type="button"
            className="bf-pbtn"
            aria-label={userPaused ? 'Play rotating messages' : 'Pause rotating messages'}
            onClick={() => {
              if (userPaused) restart();
              setUserPaused((p) => !p);
            }}
          >
            {userPaused ? <PlayIcon /> : <PauseIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section
      aria-label="Introduction"
      className={`${WRAP} grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center gap-8 lg:gap-[clamp(40px,5vw,80px)] pt-8 sm:pt-12 pb-10 lg:py-[clamp(48px,6vw,88px)]`}
    >
      <div className="min-w-0 max-w-[640px]">
        <p
          className="text-[12px] font-semibold uppercase tracking-[0.08em] mb-3.5"
          style={{ color: 'var(--orange-dark)' }}
        >
          For restaurants &amp; home kitchens
        </p>

        <HeroRotor />

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
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
            <Link
              href="/restaurant-portal/login"
              className="font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--orange-dark)' }}
            >
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* chef: fixed square frame, centered on every screen size */}
      <div className="relative grid place-items-center min-w-0">
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[min(92%,540px)] h-[64%] rounded-[32px]"
          style={{ background: 'var(--peach)' }}
        />
        <div className="relative aspect-square w-[min(100%,clamp(260px,70vw,540px))] lg:w-[min(100%,540px)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CHEF_URL}
            alt="Illustration of a chef presenting a dish"
            width={600}
            height={600}
            fetchPriority="high"
            decoding="async"
            referrerPolicy="no-referrer"
            className="block w-full h-full object-contain"
          />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Partners marquee, sliding left to right                             */
/* ------------------------------------------------------------------ */
function Partners() {
  return (
    <section aria-label="Our partners" className="pt-4 lg:pt-2 pb-14 sm:pb-16">
      <p className={`${WRAP} text-[12.5px] mb-4`} style={{ color: 'var(--gray)' }}>
        Trusted by our partners
      </p>

      <div className="bf-marquee">
        <div className="bf-track">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1 ? 'true' : undefined}>
              {[0, 1].flatMap((rep) =>
                PARTNERS.map((p) => (
                  <li key={`${copy}-${rep}-${p.id}`} className="flex-shrink-0" aria-hidden={copy === 1 || rep === 1 ? 'true' : undefined}>
                    <PartnerLogo src={p.src} name={p.name} hidden={copy === 1 || rep === 1} />
                  </li>
                ))
              )}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Live platform preview: wallet, subscribers, expected deliveries.    */
/* Every changing value sits in a fixed-size frame.                    */
/* ------------------------------------------------------------------ */
type Kind = 'urgent' | 'now' | 'today' | 'tomorrow' | 'picked';
type Row = { id: number; t: string; m: string; k: Kind; tm: string };

const TAGS: Record<Kind, string> = {
  urgent: 'Urgent',
  now: 'Deliver now',
  today: 'Today',
  tomorrow: 'Tomorrow',
  picked: 'Picked up',
};

const ROWS: Omit<Row, 'id'>[] = [
  { t: 'Small chops tray, 30 pieces', m: "Ordered from Mama Ngozi's Kitchen", k: 'urgent', tm: 'Due 1:30 PM' },
  { t: 'Weekly bread, 20 loaves', m: "Ordered from Amara's Bakes", k: 'now', tm: 'Rider 2 min away' },
  { t: 'Bottled water, 12 packs', m: 'Ordered from Coal City Drinks', k: 'today', tm: 'Today 4:00 PM' },
  { t: 'Suya, 15 sticks', m: "Ordered from Zik's Suya Spot", k: 'tomorrow', tm: 'Fri 10:00 AM' },
  { t: 'Meat pies, 40 pieces', m: "Ordered from Awele's Kitchen", k: 'picked', tm: 'Collected by Tunde' },
  { t: 'Zobo, 24 bottles', m: "Ordered from Chidi's Kitchen", k: 'today', tm: 'Today 5:30 PM' },
  { t: 'Jollof party tray', m: "Ordered from Mama Ngozi's Kitchen", k: 'now', tm: 'Rider 4 min away' },
  { t: 'Doughnuts, 36 pieces', m: "Ordered from Amara's Bakes", k: 'tomorrow', tm: 'Sat 9:00 AM' },
];

const PAYS = [
  { n: 'Chidi A.', a: 12000, s: 'renewed a monthly plan' },
  { n: 'Ngozi O.', a: 8500, s: 'subscribed to weekly snacks' },
  { n: 'Tobenna B.', a: 15000, s: 'renewed a monthly plan' },
  { n: 'Ebere O.', a: 6000, s: 'subscribed to weekly water' },
];
const NEW_SUBS = ['UK', 'AM', 'OD', 'FN', 'IJ'];
const RIDER_LINES = [
  { b: '3 riders', r: ' notified for the 2:00 PM run' },
  { b: 'Tunde', r: ' accepted, 4 min away' },
  { b: 'Ada', r: ' accepted, 6 min away' },
  { b: 'Tunde', r: ' arrived first and collected the order' },
];

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-US')}`;

function useCountUp(target: number, reduce: boolean) {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduce) {
      from.current = target;
      setVal(target);
      return;
    }
    const a = from.current;
    const start = performance.now();
    const d = 700;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / d);
      const e = 1 - Math.pow(1 - p, 3);
      const v = a + (target - a) * e;
      from.current = v;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);
  return val;
}

function LivePreview() {
  const reduce = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLElement>(0.15);

  const idRef = useRef(5);
  const nextRef = useRef(5);
  const tickRef = useRef(0);

  const [rows, setRows] = useState<Row[]>(() => ROWS.slice(0, 5).map((r, i) => ({ ...r, id: i })));
  const [tick, setTick] = useState(0);
  const [balance, setBalance] = useState(184500);
  const [pay, setPay] = useState(PAYS[0]);
  const [subs, setSubs] = useState(38);
  const [avatars, setAvatars] = useState([
    { id: -1, t: 'CA' },
    { id: -2, t: 'NO' },
    { id: -3, t: 'TB' },
    { id: -4, t: 'EO' },
  ]);
  const [riderLine, setRiderLine] = useState(RIDER_LINES[0]);
  const shownBalance = useCountUp(balance, reduce);

  useEffect(() => {
    if (!inView || reduce) return;
    const timer = setInterval(() => {
      tickRef.current += 1;
      const tk = tickRef.current;
      const base = ROWS[nextRef.current % ROWS.length];
      nextRef.current += 1;
      const row: Row = { ...base, id: idRef.current++ };
      const p = PAYS[tk % PAYS.length];
      setRows((r) => [row, ...r].slice(0, 5));
      setBalance((b) => b + p.a);
      setPay(p);
      if (tk % 2 === 0) {
        setSubs((s) => s + 1);
        setAvatars((a) => [...a, { id: tk, t: NEW_SUBS[tk % NEW_SUBS.length] }].slice(-5));
      }
      setRiderLine(RIDER_LINES[tk % RIDER_LINES.length]);
      setTick(tk);
    }, 3200);
    return () => clearInterval(timer);
  }, [inView, reduce]);

  return (
    <section ref={ref} aria-labelledby="bf-live-h" className={`${WRAP} pt-8 sm:pt-10 pb-6`}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-6">
        <div>
          <h2
            id="bf-live-h"
            className="text-[clamp(25px,4.6vw,36px)] leading-[1.1] font-semibold max-w-[20ch]"
            style={{ ...HEADING_FONT, color: 'var(--ink)', letterSpacing: '-0.02em', textWrap: 'balance' as any }}
          >
            Your kitchen&apos;s day, on one screen.
          </h2>
          <p className="mt-2.5 max-w-[48ch] text-[15px] leading-[1.55]" style={{ color: 'var(--gray)' }}>
            Subscriber payments land in your wallet, expected deliveries line up by urgency, and riders are on the way before you ask.
          </p>
        </div>
        <span className="bf-chip">Preview</span>
      </div>

      <div className="bf-live-grid">
        <div className="bf-card bf-a-wallet">
          <div className="bf-card-top">
            <h3>Wallet balance</h3>
            <span className="bf-live-dot">Live</span>
          </div>
          <p className="bf-bal" style={HEADING_FONT}>
            {naira(shownBalance)}
          </p>
          <div key={`pay-${tick}`} className={`bf-payrow ${tick > 0 ? 'bf-flash' : ''}`}>
            <span>
              +{naira(pay.a)} · {pay.n} {pay.s}
            </span>
          </div>
        </div>

        <div className="bf-card bf-a-subs">
          <div className="bf-card-top">
            <h3>Active subscribers</h3>
          </div>
          <div className="bf-subs-row">
            <p className="bf-subs-n" style={HEADING_FONT}>
              {subs}
            </p>
            <div className="bf-avatars" aria-hidden="true">
              {avatars.map((a) => (
                <span key={a.id} className={`bf-av ${tick > 0 && a.id === tick ? 'is-new' : ''}`}>
                  {a.t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bf-card bf-a-feed">
          <div className="bf-card-top">
            <h3>Expected deliveries</h3>
            <span className="bf-live-dot">Updating</span>
          </div>
          <div className="bf-feed">
            <ul key={`feed-${tick}`} className={tick > 0 ? 'is-moving' : undefined}>
              {rows.map((r, i) => (
                <li key={r.id} className={tick > 0 && i === 0 ? 'is-new' : undefined}>
                  <div style={{ minWidth: 0 }}>
                    <p className="bf-f-t">{r.t}</p>
                    <p className="bf-f-m">{r.m}</p>
                  </div>
                  <div className="bf-f-r">
                    <span className={`bf-pill ${r.k}`}>{TAGS[r.k]}</span>
                    <span className="bf-f-time">{r.tm}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="bf-riders">
            <span>
              <b>{riderLine.b}</b>
              {riderLine.r}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works: one step at a time, each sliding in from the left.    */
/* All steps share one grid cell, so the frame never changes height.   */
/* ------------------------------------------------------------------ */
const STEPS = [
  {
    label: 'Subscribe',
    title: 'Customers subscribe to your kitchen.',
    body: 'A customer finds your kitchen on BigFoods and subscribes to the items they want. They pay monthly, and the money reaches your wallet.',
    example: 'Example: ₦12,000 a month for weekly bread',
  },
  {
    label: 'Set the day',
    title: 'You choose the delivery day.',
    body: 'For each item you sell, pick the day it goes out. Bread on Fridays, small chops on Saturdays, water every Monday.',
    example: 'Example: every Friday, 20 loaves, ready by 12:30 PM',
  },
  {
    label: 'Riders assigned',
    title: 'We assign two to three riders.',
    body: 'On the delivery day we notify two to three riders near your kitchen. You never chase a dispatcher.',
    example: 'Example: 3 riders notified at 11:30 AM',
  },
  {
    label: 'First there collects',
    title: 'The first rider there delivers it.',
    body: 'Whichever rider reaches you first picks up the order and takes it to the customer. The others stand down.',
    example: 'Example: Tunde arrives first and collects the order',
  },
  {
    label: 'Reminders',
    title: 'Email reminders keep everyone on track.',
    body: 'You and your customers get a series of email reminders ahead of every delivery, so nothing is forgotten and the routine holds.',
    example: 'Example: "Your Friday delivery is 2 hours away"',
  },
];
const STEP_MS = 6500;

function HowItWorks() {
  const reduce = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLElement>(0.25);
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [hold, setHold] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const paused = userPaused || hold || reduce || !inView;

  const go = useCallback(
    (n: number) => {
      const next = (n + STEPS.length) % STEPS.length;
      if (next === cur) return;
      setPrev(cur);
      setCur(next);
      setEpoch((e) => e + 1);
    },
    [cur]
  );

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => go(cur + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [paused, cur, epoch, go]);

  return (
    <section ref={ref} id="how-it-works" aria-labelledby="bf-how-h" className={`${WRAP} pt-10 sm:pt-12 pb-14 sm:pb-16`}>
      <div className="bf-how-grid">
        <div className="bf-how-head">
          <h2
            id="bf-how-h"
            className="text-[clamp(25px,4.6vw,36px)] leading-[1.1] font-semibold max-w-[20ch]"
            style={{ ...HEADING_FONT, color: 'var(--ink)', letterSpacing: '-0.02em', textWrap: 'balance' as any }}
          >
            How subscriptions pay your kitchen.
          </h2>
          <p className="mt-2.5 max-w-[48ch] text-[15px] leading-[1.55]" style={{ color: 'var(--gray)' }}>
            Five steps, the same every week. You cook, we handle the rest.
          </p>
        </div>

        <div className="bf-rail">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              className={`${i === cur ? 'on' : ''} ${i < cur ? 'done' : ''}`}
              aria-label={`Step ${i + 1}: ${s.label}`}
              aria-current={i === cur ? 'step' : undefined}
              onClick={() => go(i)}
            >
              <span className="bf-bar">
                {i === cur && (
                  <span
                    key={`${cur}-${epoch}`}
                    className="bf-bar-fill"
                    style={{ animationDuration: `${STEP_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                  />
                )}
              </span>
              <span className="bf-lbl">
                {i + 1}&nbsp; {s.label}
              </span>
            </button>
          ))}
        </div>

        <div
          className="bf-stage"
          onPointerEnter={(e) => e.pointerType === 'mouse' && setHold(true)}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') {
              setHold(false);
              setEpoch((x) => x + 1);
            }
          }}
        >
          {STEPS.map((s, i) => (
            <article
              key={s.label}
              data-n={i + 1}
              className={`bf-step ${i === cur ? 'is-active' : i === prev ? 'is-out' : ''}`}
              aria-hidden={i === cur ? undefined : true}
            >
              <p className="bf-step-n">
                Step {i + 1} of {STEPS.length}
              </p>
              <h3 style={HEADING_FONT}>{s.title}</h3>
              <p className="bf-step-body">{s.body}</p>
              <p className="bf-ex">{s.example}</p>
            </article>
          ))}
        </div>

        <div className="bf-how-foot">
          <p className="bf-rule">
            <b>Fulfil orders early.</b> Kitchens that keep missing deliveries can be closed, so get each order ready before the riders arrive.
          </p>
          <div className="bf-arrows">
            <button type="button" aria-label="Previous step" onClick={() => go(cur - 1)}>
              <svg className="chev" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            {!reduce && (
              <button
                type="button"
                aria-label={userPaused ? 'Play steps' : 'Pause steps'}
                onClick={() => {
                  if (userPaused) setEpoch((e) => e + 1);
                  setUserPaused((p) => !p);
                }}
              >
                {userPaused ? <PlayIcon /> : <PauseIcon />}
              </button>
            )}
            <button type="button" aria-label="Next step" onClick={() => go(cur + 1)}>
              <svg className="chev" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
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
        className="bf-card-modal relative w-full max-w-[440px] max-h-[92dvh] overflow-y-auto rounded-[28px] text-left"
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
        .bf-card-modal { animation: bf-card-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        .bf-out .bf-card-modal { animation: bf-card-out 180ms ease-in forwards; }

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
          .bf-overlay, .bf-card-modal, .bf-out .bf-card-modal { animation: none; }
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
      className="block h-[30px] sm:h-9 w-auto max-w-[110px] sm:max-w-[140px] object-contain select-none"
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
