'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-password-reset-otp', {
        body: { email },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      router.push(`/restaurant-portal/reset-password?email=${encodeURIComponent(email)}`);
    } catch (e: any) {
      setError(e?.message ?? 'Could not send the reset code — try again.');
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
      <p className="text-[12.5px] mb-6" style={{ color: 'var(--gray)' }}>
        Enter the email on your account and we'll send you a 6-digit code to reset your password.
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
          Send reset code
        </button>
      </form>

      <p className="text-[12.5px] text-center mt-5" style={{ color: 'var(--gray)' }}>
        <Link href="/restaurant-portal/login" className="font-semibold" style={{ color: 'var(--orange)' }}>
          Back to log in
        </Link>
      </p>
    </div>
  );
}
