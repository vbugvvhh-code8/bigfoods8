'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle2 } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const supabase = getBrowserSupabase();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/restaurant-portal/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? 'Could not send the reset link — try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[380px] mx-auto px-4 py-14">
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        Restaurant Portal
      </p>
      <h1 className="text-[22px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Reset your password
      </h1>

      {sent ? (
        <div className="mt-4 p-4 rounded-[12px] flex gap-3" style={{ background: 'var(--peach)' }}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--green)' }} />
          <div>
            <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              Check your email
            </p>
            <p className="text-[12px]" style={{ color: 'var(--gray)' }}>
              We sent a reset link to {email}. Open it on this device to set a new password.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[12.5px] mb-6" style={{ color: 'var(--gray)' }}>
            Enter the email on your account and we'll send you a link to set a new password.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
                style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
              />
            </div>

            {error && (
              <p className="text-[11.5px] mb-3 p-3 rounded-[9px]" style={{ background: '#FEF2F2', color: 'var(--red)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'var(--orange)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Send reset link
            </button>
          </form>
        </>
      )}

      <p className="text-[12.5px] text-center mt-5" style={{ color: 'var(--gray)' }}>
        <Link href="/restaurant-portal/login" className="font-semibold" style={{ color: 'var(--orange)' }}>
          Back to log in
        </Link>
      </p>
    </div>
  );
}
