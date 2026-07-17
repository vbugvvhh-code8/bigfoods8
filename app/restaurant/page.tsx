'use client';

import Link from 'next/link';
import Footer from '@/components/layout/Footer';

export default function RestaurantLandingPage() {
  return (
    <div style={{ background: 'var(--white)' }}>
      <div className="max-w-[1180px] mx-auto px-6">
        {/* header */}
        <header className="pt-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{
                background: 'linear-gradient(155deg, var(--orange), var(--orange-dark))',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: '11.5px',
              }}
            >
              BF
            </div>
            <span
              className="text-[16.5px] font-semibold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              BigFoods
            </span>
            <span className="text-[11.5px] ml-1.5" style={{ color: 'var(--gray)' }}>
              Restaurant Portal
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-[13.5px] font-medium">
            <Link href="/rider-portal" style={{ color: 'var(--gray)' }} className="hover:opacity-80">
              Become a rider
            </Link>
            <Link href="/blogs" style={{ color: 'var(--gray)' }} className="hover:opacity-80">
              Blog
            </Link>
            <Link
              href="/restaurant-portal/dashboard"
              className="px-4.5 py-2 rounded-[9px] font-semibold text-[13.5px]"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              Log in
            </Link>
          </nav>
        </header>

        {/* hero */}
        <div className="grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] gap-9 md:gap-12 items-center pt-8 pb-6 md:pt-14 md:pb-10">
          <div className="max-w-[560px]">
            <p
              className="text-[11px] font-semibold uppercase tracking-wide mb-3"
              style={{ color: 'var(--orange)' }}
            >
              For restaurants &amp; home kitchens
            </p>
            <h1
              className="text-[34px] md:text-[44px] lg:text-[50px] leading-[1.1] font-semibold mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}
            >
              Cook. We handle pickup, delivery, and getting you customers.
            </h1>
            <p className="text-[14px] md:text-[15px] leading-[1.6] mb-0 max-w-[460px]" style={{ color: 'var(--gray)' }}>
              Join BigFoods and put your kitchen in front of hungry customers across Anambra —
              no delivery staff required.
            </p>
          </div>

          <LiveTicker />
        </div>

        {/* CTA — stays directly under the ticker banner */}
        <div className="max-w-[560px] pb-10 md:pb-14">
          <div className="flex items-center gap-4 flex-wrap mb-4">
            <Link
              href="/restaurant-portal/onboarding/restaurant-info"
              className="px-6 py-[15px] rounded-xl text-white font-semibold text-[14px] inline-block"
              style={{
                background: 'var(--orange)',
                boxShadow: '0 10px 20px -8px rgba(249,115,22,0.55)',
              }}
            >
              Register your restaurant
            </Link>
            <p className="text-[12.5px]" style={{ color: 'var(--gray)' }}>
              Already registered?{' '}
              <Link href="/restaurant-portal/dashboard" className="font-semibold" style={{ color: 'var(--orange)' }}>
                Log in
              </Link>
            </p>
          </div>
          <p className="text-[11px] leading-[1.5]" style={{ color: 'var(--gray)' }}>
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
          className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-7 pt-1.5 pb-2"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <Feature
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ stroke: "var(--orange)" }} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
            title="Free dispatch, always"
            desc="A rider comes to collect and deliver every order — no setup cost, ever."
          />
          <Feature
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ stroke: "var(--orange)" }} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 21l-1-4" /><path d="M13 3l1 4" /><path d="M4 15l4-11 4 11a4 4 0 0 1-8 0z" /><path d="M12 15l4-11 4 11a4 4 0 0 1-8 0z" />
              </svg>
            }
            title="Launch already featured"
            desc="Every new kitchen goes live with a visibility boost — a head start while your first reviews come in."
          />
          <Feature
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ stroke: "var(--orange)" }} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
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
          0% { opacity: 0; transform: translateY(14px); }
          2% { opacity: 1; transform: translateY(0); }
          14% { opacity: 1; transform: translateY(0); }
          17% { opacity: 0; transform: translateY(-14px); }
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

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex md:flex-col gap-3.5 md:gap-3.5 py-5" style={{ borderBottom: '1px solid var(--line)' }}>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--peach)' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[14.5px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>
          {title}
        </p>
        <p className="text-[12.5px] leading-[1.55]" style={{ color: 'var(--gray)' }}>
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

function LiveTicker() {
  return (
    <div
      className="relative rounded-[20px] p-5 md:p-[22px] min-h-[210px] md:min-h-[280px] overflow-hidden"
      style={{ background: 'var(--peach)' }}
    >
      <div
        className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide mb-4"
        style={{ color: 'var(--orange-dark)' }}
      >
        <span className="bf-live-dot w-1.5 h-1.5 rounded-full" style={{ background: 'var(--orange)' }} />
        Live on BigFoods
      </div>
      <div className="relative h-[150px] md:h-[200px]">
        {TICKETS.map((t, i) => (
          <div
            key={t.title}
            className={`bf-ticket bf-t${i + 1} absolute inset-0 rounded-[13px] p-4 md:p-5 flex flex-col justify-center`}
            style={{
              background: 'var(--white)',
              boxShadow: '0 8px 20px -8px rgba(25,23,20,0.18)',
              animationDelay: `${i * 4}s`,
            }}
          >
            <span
              className="inline-block w-fit text-[9.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1.5"
              style={{ color: 'var(--orange-dark)', background: 'var(--peach)' }}
            >
              {t.tag}
            </span>
            <b
              className="block text-[14.5px] md:text-[16px] mb-0.5"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}
            >
              {t.title}
            </b>
            <span className="text-[12px]" style={{ color: 'var(--gray)' }}>
              {t.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
