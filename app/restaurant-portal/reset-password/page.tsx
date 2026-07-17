'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getBrowserSupabase();

  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Supabase's reset-password link can arrive as either a PKCE `?code=` param
  // or an implicit-flow hash that the client auto-detects and surfaces as a
  // PASSWORD_RECOVERY auth event — handle both so this works regardless of
  // which flow the project is configured for.
  useEffect(() => {
    let settled = false;

    const code = searchParams.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        settled = true;
        if (error) setLinkInvalid(true);
        else setReady(true);
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        settled = true;
        setReady(true);
      }
    });

    // If neither a code param nor a recovery event shows up quickly, the
    // link is missing/expired/already used.
    const timeout = setTimeout(() => {
      if (!settled) setLinkInvalid(true);
    }, 4000);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid || !passwordsMatch) return;
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => router.push('/restaurant-portal/login'), 1800);
    } catch (e: any) {
      setError(e?.message ?? 'Could not update your password — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[380px] mx-auto px-4 py-14">
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        Restaurant Portal
      </p>
      <h1 className="text-[22px] font-semibold mb-5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Set a new password
      </h1>

      {linkInvalid ? (
        <div>
          <p className="text-[12.5px] mb-4" style={{ color: 'var(--gray)' }}>
            This reset link is invalid or has expired. Request a new one below.
          </p>
          <Link
            href="/restaurant-portal/forgot-password"
            className="inline-block px-5 py-2.5 rounded-[9px] text-[13px] font-semibold text-white"
            style={{ background: 'var(--orange)' }}
          >
            Request a new link
          </Link>
        </div>
      ) : done ? (
        <p className="text-[13px]" style={{ color: 'var(--green)' }}>
          ✓ Password updated — taking you to log in…
        </p>
      ) : !ready ? (
        <div className="flex items-center gap-2 py-4" style={{ color: 'var(--gray)' }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[12.5px]">Verifying your link…</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
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
            disabled={!passwordValid || !passwordsMatch || saving}
            className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 mt-3"
            style={{ background: 'var(--orange)' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Update password
          </button>
        </form>
      )}
    </div>
  );
}
