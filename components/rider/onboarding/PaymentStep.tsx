'use client';

import { useEffect, useState } from 'react';
import usePaystackPayment from '@/hooks/usePaystackPayment';
import usePricingConfig from '@/hooks/usePricingConfig';
import getBrowserSupabase from '@/lib/supabase/client';
import { RiderOnboardingDraft } from '@/hooks/useRiderOnboardingSession';

interface PaymentStepProps {
  draft: RiderOnboardingDraft;
  onBack: () => void;
}

export default function PaymentStep({ draft, onBack }: PaymentStepProps) {
  const supabase = getBrowserSupabase();
  const { status, error, startPayment, verifyPayment } = usePaystackPayment();
  // Its own fee, separate from the restaurant portal's verification_fee key.
  const { prices, loading } = usePricingConfig(['rider_verification_fee']);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Paystack redirects back with ?reference=... after checkout — verify it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    if (reference) verifyPayment(reference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The rider row must exist (profile_id-linked) before paystack-initialize
  // will accept a charge for it — same pattern as restaurant-onboarding-save
  // running before the restaurant's payment step.
  async function saveRiderThenPay() {
    setSaveError(null);
    const { error: saveErr } = await supabase.functions.invoke('rider-onboarding-save', {
      body: {
        name: draft.fullName,
        vehicle_type: draft.vehicleType,
        plate_number: draft.plateNumber,
        zone: draft.zone,
      },
    });
    if (saveErr) {
      setSaveError('Could not save your rider details — try again.');
      return;
    }
    startPayment('rider_verification_fee');
  }

  if (status === 'success') {
    return (
      <div className="text-center py-1.5">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-semibold mx-auto mb-4" style={{ background: 'var(--orange)' }}>✓</div>
        <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>You&apos;re verified</h2>
        <p className="text-[12.5px]" style={{ color: 'var(--gray)' }}>
          Your application is in for review. We&apos;ll notify you once approved — the rider dashboard isn&apos;t built yet.
        </p>
      </div>
    );
  }

  const fee = prices.rider_verification_fee;
  const busy = status === 'starting' || status === 'redirecting';

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>Step 3 of 3</p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Verify your account</h2>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--gray)' }}>A small one-time fee to confirm you&apos;re serious about riding.</p>

      <div className="rounded-[10px] p-3.5 mb-4" style={{ background: 'var(--peach)' }}>
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-[22px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {loading ? '…' : fee != null ? `₦${fee.toLocaleString()}` : 'Unavailable'}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--gray)' }}>one-time</span>
        </div>
        <p className="text-[11.5px]" style={{ color: 'var(--gray)', lineHeight: 1.5 }}>
          This is to make sure that only serious people are registering.
        </p>
      </div>

      {(error || saveError) && <p className="text-[11.5px] mb-3" style={{ color: 'var(--red)' }}>{error ?? saveError}</p>}

      <button
        onClick={saveRiderThenPay}
        disabled={loading || fee == null || busy}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white mb-2.5 disabled:opacity-40"
        style={{ background: 'var(--orange)' }}
      >
        {busy ? 'Redirecting…' : 'Pay & verify'}
      </button>
      <button onClick={onBack} className="w-full py-2.5 text-[12.5px]" style={{ color: 'var(--gray)', background: 'none', border: 'none' }}>
        Back
      </button>
    </>
  );
}
