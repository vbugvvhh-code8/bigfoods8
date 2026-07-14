'use client';

import { useRouter } from 'next/navigation';
import EmailVerifyField from '@/components/restaurant/onboarding/EmailVerifyField';
import useOnboardingSession, { ONBOARDING_STEPS } from '@/hooks/useOnboardingSession';

export default function SellerInfoPage() {
  const router = useRouter();
  const { draft, updateDraft, hydrated } = useOnboardingSession();

  if (!hydrated) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  const canContinue = !!(draft.fullName && draft.phone && draft.emailVerified);

  function handleContinue() {
    router.push(ONBOARDING_STEPS[1].path);
  }

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        Step 1 of 5
      </p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Tell us about yourself
      </h2>
      <p className="text-[12.5px] mb-5" style={{ color: 'var(--gray)' }}>
        Takes about 2 minutes. You can edit this later.
      </p>

      <div className="mb-3.5">
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
          Full name
        </label>
        <input
          value={draft.fullName ?? ''}
          onChange={(e) => updateDraft({ fullName: e.target.value })}
          placeholder="e.g. Ngozi Eze"
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
          style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
        />
      </div>

      <div className="mb-3.5">
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
          Phone number
        </label>
        <input
          value={draft.phone ?? ''}
          onChange={(e) => updateDraft({ phone: e.target.value })}
          placeholder="080 000 0000"
          type="tel"
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
          style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
        />
      </div>

      <div className="mb-5">
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
          Email
        </label>
        <input
          value={draft.email ?? ''}
          onChange={(e) => updateDraft({ email: e.target.value, emailVerified: false })}
          placeholder="you@example.com"
          type="email"
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
          style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
        />
        <EmailVerifyField
          email={draft.email ?? ''}
          fullName={draft.fullName}
          phone={draft.phone}
          verified={!!draft.emailVerified}
          onVerified={() => updateDraft({ emailVerified: true })}
        />
      </div>

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40"
        style={{ background: 'var(--orange)' }}
      >
        Continue
      </button>
    </>
  );
}
