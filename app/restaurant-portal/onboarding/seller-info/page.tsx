'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import EmailVerifyField from '@/components/restaurant/onboarding/EmailVerifyField';
import useOnboardingSession, { ONBOARDING_STEPS } from '@/hooks/useOnboardingSession';
import getBrowserSupabase from '@/lib/supabase/client';

export default function SellerInfoPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const { draft, updateDraft, hydrated } = useOnboardingSession();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canContinue = !!(draft.fullName && draft.phone && draft.emailVerified && draft.passwordSet);

  async function handleSetPassword() {
    if (!passwordValid || !passwordsMatch) return;
    setSavingPassword(true);
    setPasswordError(null);
    try {
      // The account already exists at this point — email OTP verification
      // (previous field) already created a real Supabase Auth session for
      // this user. This just attaches a password to that same account
      // rather than creating a separate signup path.
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      updateDraft({ passwordSet: true });
    } catch (e: any) {
      setPasswordError(e?.message ?? 'Could not set your password — try again.');
    } finally {
      setSavingPassword(false);
    }
  }

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

      <div className="mb-3.5">
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
          Email
        </label>
        <input
          value={draft.email ?? ''}
          onChange={(e) => updateDraft({ email: e.target.value, emailVerified: false, passwordSet: false })}
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

      {draft.emailVerified && (
        <div className="mb-5">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Set a password
          </label>

          {draft.passwordSet ? (
            <p className="text-[11.5px]" style={{ color: 'var(--green)' }}>
              ✓ Password set
            </p>
          ) : (
            <>
              <div className="relative mb-2">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2.5 pr-10 rounded-[9px] text-[13px] outline-none"
                  style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--gray)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none mb-2"
                style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
              />

              {password.length > 0 && !passwordValid && (
                <p className="text-[11px] mb-1.5" style={{ color: 'var(--red)' }}>
                  Password must be at least 8 characters.
                </p>
              )}
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[11px] mb-1.5" style={{ color: 'var(--red)' }}>
                  Passwords don't match.
                </p>
              )}
              {passwordError && (
                <p className="text-[11px] mb-1.5" style={{ color: 'var(--red)' }}>
                  {passwordError}
                </p>
              )}

              <button
                type="button"
                onClick={handleSetPassword}
                disabled={!passwordValid || !passwordsMatch || savingPassword}
                className="w-full py-2.5 rounded-[9px] text-[12.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: 'var(--orange)' }}
              >
                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Set password
              </button>
            </>
          )}
        </div>
      )}

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
