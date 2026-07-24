'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';
import { extractEdgeFunctionError } from '@/lib/extractEdgeFunctionError';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getBrowserSupabase();
  const email = searchParams.get('email') ?? '';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = code.length === 6 && passwordValid && passwordsMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-password-reset-otp', {
        body: { email, code, newPassword: password },
      });
      if (fnError) throw new Error(await extractEdgeFunctionError(fnError, 'Could not update your password — try again.'));
      if (data?.error) throw new Error(data.error);
      setDone(true);
      setTimeout(() => router.push('/restaurant-portal/login'), 1800);
    } catch (e: any) {
      setError(e?.message ?? 'Could not update your password — try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-password-reset-otp', {
        body: { email },
      });
      if (fnError) throw new Error(await extractEdgeFunctionError(fnError, 'Could not resend the code — try again.'));
      if (data?.error) throw new Error(data.error);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (e: any) {
      setError(e?.message ?? 'Could not resend the code — try again.');
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <div className="max-w-[380px] mx-auto px-4 py-14">
        <p className="text-[12.5px] mb-4" style={{ color: 'var(--gray)' }}>
          Missing email — start from the reset password page again.
        </p>
        <Link
          href="/restaurant-portal/forgot-password"
          className="inline-block px-5 py-2.5 rounded-[9px] text-[13px] font-semibold text-white"
          style={{ background: 'var(--orange)' }}
        >
          Reset password
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[380px] mx-auto px-4 py-14">
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        Restaurant Portal
      </p>
      <h1 className="text-[22px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Enter your code
      </h1>

      {done ? (
        <p className="text-[13px]" style={{ color: 'var(--green)' }}>
          ✓ Password updated — taking you to log in…
        </p>
      ) : (
        <>
          <p className="text-[12.5px] mb-6" style={{ color: 'var(--gray)' }}>
            We sent a 6-digit code to {email}. Enter it below along with your new password.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3.5">
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
                Reset code
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none tracking-widest"
                style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
              />
            </div>

            <div className="mb-3">
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
                New password
              </label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
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
            </div>

            <div className="mb-2">
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
                Confirm password
              </label>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
                style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
              />
            </div>

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
            {error && (
              <p className="text-[11.5px] mb-3 p-3 rounded-[9px]" style={{ background: '#FEF2F2', color: 'var(--red)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 mt-1"
              style={{ background: 'var(--orange)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Update password
            </button>
          </form>

          <p className="text-[12px] text-center mt-4" style={{ color: 'var(--gray)' }}>
            {resent ? (
              'New code sent.'
            ) : (
              <>
                Didn't get a code?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="font-semibold disabled:opacity-40"
                  style={{ color: 'var(--orange)' }}
                >
                  {resending ? 'Sending…' : 'Resend'}
                </button>
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}
