'use client';

import Link from 'next/link';
import usePricingConfig from '@/hooks/usePricingConfig';
import Footer from '@/components/layout/Footer';

const LOGO_URL =
  'https://dpioixansygkjdbphfdj.supabase.co/storage/v1/object/public/product-images/0.4568313681357089.webp';
const RIDER_PHOTO_URL =
  'https://dpioixansygkjdbphfdj.supabase.co/storage/v1/object/public/product-images/0.29559022117992917.webp';

const FEATURES = [
  { icon: '⏱', title: 'Go online, go offline — anytime', desc: 'No shifts. Ride when it works for you.' },
  { icon: '₦', title: 'Keep 100% of your tips', desc: 'Plus your share of every delivery fee.' },
  { icon: '📍', title: 'Orders near you, automatically', desc: 'We match you to the closest pickups.' },
];

export default function RiderPortalLandingPage() {
  const { prices, loading } = usePricingConfig(['rider_payout_minimum']);

  return (
    <div style={{ background: 'var(--white)' }}>
      {/* sticky header — same pattern as the restaurant portal */}
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
            <img
              src={LOGO_URL}
              alt="BigFoods logo"
              referrerPolicy="no-referrer"
              className="w-[26px] h-[26px] rounded-lg object-cover flex-shrink-0"
              style={{ background: 'var(--peach)' }}
            />
            <span
              className="text-[14.5px] font-semibold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              BigFoods
            </span>
          </div>

          <span className="text-[10px] md:hidden" style={{ color: 'var(--gray)' }}>
            Rider Portal
          </span>

          <nav className="hidden md:flex items-center gap-6.5 text-[12px] font-medium">
            <span style={{ color: 'var(--gray)' }}>Rider Portal</span>
            <Link href="/restaurant-portal" style={{ color: 'var(--gray)' }} className="hover:opacity-80">
              Restaurant Portal
            </Link>
            <Link href="/blogs" style={{ color: 'var(--gray)' }} className="hover:opacity-80">
              Blog
            </Link>
            <Link
              href="/rider-portal/login"
              className="px-4 py-[7px] rounded-lg font-semibold text-[12px]"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              Log in
            </Link>
          </nav>
        </div>
      </header>

      {/* hero — photo only, full-bleed */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9', background: 'linear-gradient(160deg, var(--orange), var(--orange-dark))' }}>
        <img
          src={RIDER_PHOTO_URL}
          alt="BigFoods rider"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center top' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(15,13,11,0.35) 0%, rgba(15,13,11,0) 35%)' }}
        />
        <span
          className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--orange-dark)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#1F6E5C' }} />
          1,200+ riders online
        </span>
      </div>

      <div className="max-w-[1180px] mx-auto px-6">
        {/* text + CTA — sits below the hero photo */}
        <div className="max-w-[440px] pt-7 md:pt-9 text-left">
          <p
            className="text-[10.5px] font-semibold uppercase tracking-wide mb-2.5"
            style={{ color: 'var(--orange)' }}
          >
            For dispatch riders
          </p>
          <h1
            className="text-[25px] md:text-[30px] leading-[1.15] font-semibold mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}
          >
            Your bike. Your hours. Steady pay.
          </h1>
          <p className="text-[12.5px] leading-[1.55] mb-4" style={{ color: 'var(--gray)' }}>
            Go online whenever you're ready to ride, pick up nearby orders, and get paid straight
            to your wallet.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/rider-portal/onboarding/details"
              className="px-5.5 py-3 rounded-xl text-white font-semibold text-[13px] inline-block"
              style={{ background: 'var(--orange)', boxShadow: '0 8px 16px -8px rgba(249,115,22,0.5)' }}
            >
              Apply to ride
            </Link>
            <p className="text-[11px]" style={{ color: 'var(--gray)' }}>
              Already riding?{' '}
              <Link href="/rider-portal/login" className="font-semibold" style={{ color: 'var(--orange)' }}>
                Log in
              </Link>
            </p>
          </div>
        </div>

        {/* wallet — compact rectangular card, below the CTA */}
        <div className="pt-6 pb-2">
          <div
            className="rounded-xl px-4 py-3.5"
            style={{ background: 'var(--ink)', color: '#fff', position: 'relative', overflow: 'hidden', maxWidth: 480 }}
          >
            <div
              className="absolute top-0 left-0 right-0"
              style={{
                height: 3,
                background: 'repeating-linear-gradient(90deg, var(--orange) 0 18px, transparent 18px 32px)',
                opacity: 0.8,
              }}
            />
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide" style={{ color: '#5FD9BB' }}>
                <span className="w-[5px] h-[5px] rounded-full" style={{ background: '#5FD9BB' }} />
                Online now
              </span>
              <span className="text-[9px]" style={{ color: '#C9C2B9' }}>Today, 17 Jul</span>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[9.5px] uppercase tracking-wide mb-0.5" style={{ color: '#C9C2B9' }}>
                  Earned today
                </p>
                <p
                  className="text-[22px] font-bold leading-none"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  ₦15,000
                </p>
              </div>

              <div className="flex gap-3.5 pb-0.5">
                {[
                  { value: '12', label: 'Trips' },
                  { value: '100%', label: 'Completed' },
                  {
                    value: loading ? '…' : `₦${(prices.rider_payout_minimum ?? 0).toLocaleString()}`,
                    label: 'Payout mark',
                  },
                ].map((s) => (
                  <div key={s.label} className="text-left">
                    <b className="block text-[12px] font-semibold leading-none mb-0.5">{s.value}</b>
                    <span className="text-[8px] uppercase tracking-wide" style={{ color: '#C9C2B9' }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="flex items-center justify-between mt-2.5 pt-2.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.14)' }}
            >
              <p className="text-[9px]" style={{ color: '#C9C2B9' }}>
                Cash out anytime — <b style={{ color: '#fff', fontWeight: 600 }}>no minimum wait</b>
              </p>
              <span
                className="text-[10px] font-bold px-3 py-1.5 rounded-md"
                style={{ background: 'var(--orange)', color: '#fff' }}
              >
                Go online
              </span>
            </div>
          </div>
        </div>

        {/* features */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-6.5 pt-3 pb-2"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex md:flex-col gap-3 py-4"
              style={{ borderBottom: '1px solid var(--line)' }}
            >
              <div
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 text-[14px]"
                style={{ background: 'var(--peach)', color: 'var(--orange)' }}
              >
                {f.icon}
              </div>
              <div>
                <p className="text-[12.5px] font-semibold mb-1 text-left" style={{ color: 'var(--ink)' }}>
                  {f.title}
                </p>
                <p className="text-[11px] leading-[1.5] text-left" style={{ color: 'var(--gray)' }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
