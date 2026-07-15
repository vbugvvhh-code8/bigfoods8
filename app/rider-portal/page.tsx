'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import usePricingConfig from '@/hooks/usePricingConfig';

const FEATURES = [
  { icon: '⏱', title: 'Go online, go offline — anytime', desc: 'No shifts. Ride when it works for you.' },
  { icon: '₦', title: 'Keep 100% of your tips', desc: 'Plus your share of every delivery fee.' },
  { icon: '📍', title: 'Orders near you, automatically', desc: 'We match you to the closest pickups.' },
];

export default function RiderPortalLandingPage() {
  const { prices, loading } = usePricingConfig(['rider_payout_minimum']);

  return (
    <div className="min-h-screen flex justify-center px-4 py-8 pb-16" style={{ background: 'var(--white)' }}>
      <div className="w-full max-w-[380px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="mr-1" style={{ color: 'var(--gray)' }}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-5 h-5 rounded-md flex-shrink-0" style={{ background: 'var(--orange)' }} />
            <span className="font-semibold text-[15px] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              BigFoods
            </span>
          </div>
          <span className="text-[11px]" style={{ color: 'var(--gray)' }}>Rider Portal</span>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: 'var(--orange)' }}>
          For dispatch riders
        </p>
        <h1
          className="text-[27px] font-bold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)' }}
        >
          Your bike. Your hours. Steady pay.
        </h1>
        <p className="text-[13px] mb-5 max-w-xs" style={{ color: 'var(--gray)' }}>
          Go online whenever you&apos;re ready to ride, pick up nearby orders, and get paid straight to your wallet.
        </p>

        {/* No rider session exists yet (handoff gap #1) — payout threshold is a
            real pricing_config read; the rest is a clearly-labeled empty state. */}
        <div className="rounded-2xl p-4 mb-6 relative overflow-hidden" style={{ background: 'var(--ink)', color: 'var(--white)' }}>
          <span
            className="absolute top-4 right-4 text-[9.5px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--orange)' }}
          >
            Preview
          </span>
          <p className="text-[10.5px] uppercase tracking-wide mb-1" style={{ color: '#B8B0A8' }}>Balance</p>
          <p className="text-[26px] font-bold mb-2.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>₦0</p>
          <div className="flex gap-4">
            {[
              { value: '0', label: 'Deliveries' },
              { value: '—', label: 'Tip %' },
              { value: loading ? '…' : `₦${(prices.rider_payout_minimum ?? 0).toLocaleString()}`, label: 'Payout mark' },
            ].map((s) => (
              <div key={s.label} className="text-[11px]" style={{ color: '#B8B0A8' }}>
                <b className="block text-[13px] font-semibold" style={{ color: 'white' }}>{s.value}</b>
                {s.label}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 divide-y" style={{ borderColor: 'var(--line)' }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-3 items-start py-3">
              <div
                className="w-[26px] h-[26px] rounded-lg flex items-center justify-center text-[13px] flex-shrink-0"
                style={{ background: 'var(--peach)', color: 'var(--orange)' }}
              >
                {f.icon}
              </div>
              <div>
                <p className="text-[13px] font-semibold mb-0.5" style={{ color: 'var(--ink)' }}>{f.title}</p>
                <p className="text-[11.5px]" style={{ color: 'var(--gray)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/rider-portal/onboarding/details"
          className="block w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white text-center"
          style={{ background: 'var(--orange)' }}
        >
          Apply to ride
        </Link>
        <p className="text-center text-[12px] mt-3.5" style={{ color: 'var(--gray)' }}>
          Already riding?{' '}
          <span className="font-semibold" style={{ color: 'var(--gray)' }} title="Rider login needs auth wiring, gap #1">Log in</span>
        </p>
      </div>
    </div>
  );
}
