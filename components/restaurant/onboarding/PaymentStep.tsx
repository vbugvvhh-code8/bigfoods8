'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import usePricingConfig from '@/hooks/usePricingConfig';
import usePaystackPayment from '@/hooks/usePaystackPayment';
import getBrowserSupabase from '@/lib/supabase/client';
import { PUBLIC_LAUNCH_DATE } from '@/lib/launchDate';
import { stepPath } from '@/hooks/useOnboardingSession';

type Plan = '1_month' | '3_months';

const PRICE_KEYS = ['onboarding_plan_1_month', 'onboarding_plan_3_months'];

const launchLabel = PUBLIC_LAUNCH_DATE.toLocaleDateString('en-NG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Onboarding payment: one payment that includes free ads for the plan period.
 * Prices come from pricing_config (and are re-read on the server — the browser
 * only says which plan). Also handles the Paystack return (?reference=...).
 */
export default function PaymentStep() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const { prices, loading: pricesLoading } = usePricingConfig(PRICE_KEYS);
  const { status, error, startPayment, verifyPayment } = usePaystackPayment();

  const [plan, setPlan] = useState<Plan>('3_months');
  const [paid, setPaid] = useState(false);
  const [checking, setChecking] = useState(true);
  const verifiedRef = useRef(false);

  // On load: verify a returning Paystack payment, otherwise see if it's already paid.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const reference = new URLSearchParams(window.location.search).get('reference');
      if (reference && !verifiedRef.current) {
        verifiedRef.current = true;
        const result = await verifyPayment(reference);
        if (!cancelled && result.success) {
          setPaid(true);
          setChecking(false);
          return;
        }
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: restaurant } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).maybeSingle();
        if (restaurant) {
          const { count } = await supabase
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurant.id)
            .eq('type', 'onboarding_plan')
            .eq('status', 'success');
          if (!cancelled && count) setPaid(true);
        }
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pricesLoading || checking || status === 'verifying') {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        {status === 'verifying' ? 'Confirming your payment…' : 'Loading…'}
      </p>
    );
  }

  const one = prices.onboarding_plan_1_month;
  const three = prices.onboarding_plan_3_months;
  const saving = one && three ? one * 3 - three : 0;
  const busy = status === 'starting' || status === 'redirecting';

  if (paid) {
    return (
      <>
        <div className="p-4 rounded-[12px] mb-5" style={{ border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-1.5 text-[13px] font-semibold mb-1.5" style={{ color: 'var(--green)' }}>
            <CheckCircle2 className="w-4 h-4" /> You&apos;re in
          </div>
          <p className="text-[12px]" style={{ color: 'var(--gray)' }}>
            Your plan is paid. Your free ads run from {launchLabel}, the day BigFoods opens to customers.
          </p>
        </div>
        <button
          onClick={() => router.push(stepPath('delivery-zone'))}
          className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white"
          style={{ background: 'var(--orange)' }}
        >
          Continue
        </button>
      </>
    );
  }

  const options: { id: Plan; title: string; price?: number; note: string; badge?: string }[] = [
    { id: '3_months', title: '3 months', price: three, note: saving > 0 ? `Save ₦${saving.toLocaleString()}` : '', badge: 'Best value' },
    { id: '1_month', title: '1 month', price: one, note: '' },
  ];

  return (
    <>
      <p className="text-[12.5px] mb-3" style={{ color: 'var(--gray)' }}>
        Pick a plan. It covers your onboarding and includes free ads, so customers see you first.
      </p>
      <div className="p-3.5 rounded-[10px] mb-4" style={{ background: 'var(--peach)' }}>
        <p className="text-[12px] font-semibold mb-1">Why we ask you to pay</p>
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink)' }}>
          This payment helps us keep out time-wasters and accept only serious restaurants and cooks. We take just{' '}
          <strong>1,000 sellers per state</strong>. After that, nobody new can join in that state, and the only way in
          is to buy an account from a seller who wants to sell. That makes your account an asset.
        </p>
      </div>

      <div role="radiogroup" aria-label="Plan" className="space-y-2.5 mb-5">
        {options.map((o) => {
          const active = plan === o.id;
          return (
            <label
              key={o.id}
              className="flex items-center justify-between rounded-[12px] cursor-pointer"
              style={{
                border: active ? '2px solid var(--orange)' : '1px solid var(--line)',
                padding: active ? 'calc(1rem - 1px)' : '1rem',
                background: active ? 'var(--peach)' : 'var(--white)',
              }}
            >
              <input
                type="radio"
                name="plan"
                value={o.id}
                checked={active}
                onChange={() => setPlan(o.id)}
                className="sr-only"
              />
              <span>
                <span className="flex items-center gap-2 text-[14px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {o.title}
                  {o.badge && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--orange)' }}>
                      {o.badge}
                    </span>
                  )}
                </span>
                {o.note && (
                  <span className="block text-[11.5px]" style={{ color: 'var(--green)' }}>
                    {o.note}
                  </span>
                )}
              </span>
              <span className="text-[15px] font-semibold" style={{ color: 'var(--orange)' }}>
                {o.price ? `₦${o.price.toLocaleString()}` : '—'}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="text-[11.5px] mb-3" style={{ color: 'var(--red)' }} role="alert">
          {error}
        </p>
      )}

      <button
        onClick={() => startPayment('onboarding_plan', { plan })}
        disabled={busy || !prices[`onboarding_plan_${plan}`]}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: 'var(--orange)' }}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Pay and continue
      </button>
      <p className="text-[11.5px] text-center mt-3" style={{ color: 'var(--gray)' }}>
        BigFoods opens to customers on <strong>{launchLabel}</strong>. Your free ads start that day, so paying early
        costs you nothing.
      </p>
    </>
  );
}
