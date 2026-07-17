'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';

export default function RestaurantLoginPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/restaurant-portal/dashboard');
    } catch (e: any) {
      setError(
        e?.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : e?.message ?? 'Could not log in — try again.'
      );
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
        Log in
      </h1>
      <p className="text-[12.5px] mb-6" style={{ color: 'var(--gray)' }}>
        Welcome back — enter your details to get to your dashboard.
      </p>

      <form onSubmit={handleLogin}>
        <div className="mb-3.5">
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

        <div className="mb-2">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Password
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            placeholder="Your password"
            className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
            style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
          />
        </div>

        <div className="mb-5 text-right">
          <Link href="/restaurant-portal/forgot-password" className="text-[11.5px] font-semibold" style={{ color: 'var(--orange)' }}>
            Forgot password?
          </Link>
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
          Log in
        </button>
      </form>

      <p className="text-[12.5px] text-center mt-5" style={{ color: 'var(--gray)' }}>
        New to BigFoods?{' '}
        <Link href="/restaurant-portal/onboarding/seller-info" className="font-semibold" style={{ color: 'var(--orange)' }}>
          Register your restaurant
        </Link>
      </p>
    </div>
  );
}
