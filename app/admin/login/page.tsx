'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getBrowserSupabase();

  // Fallback redirect: if a session already exists or appears mid-flight,
  // send the user to /admin instead of showing the login form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/admin');
        router.refresh();
      }
    });
    return () => subscription?.unsubscribe();
  }, [supabase, router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange listener above will fire and redirect.
      // Also push directly as a belt-and-suspenders fallback.
      router.replace('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F4F0]">
      <form onSubmit={signIn} className="w-[420px] p-8 rounded-lg" style={{background: 'white', border: '1px solid var(--line)'}}>
        <h2 className="text-[18px] font-semibold mb-1">Admin sign in</h2>
        <p className="text-[12px] mb-4" style={{color: 'var(--gray)'}}>Use your admin credentials to access the console</p>

        <label className="block text-[12px] mb-2">Email</label>
        <input className="w-full mb-3 px-3 py-2 rounded-md border" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="block text-[12px] mb-2">Password</label>
        <input type="password" className="w-full mb-4 px-3 py-2 rounded-md border" value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <div className="text-red-600 text-[13px] mb-3">{error}</div>}

        <button disabled={loading} className="w-full py-2 rounded-md font-semibold" style={{background: 'var(--orange)', color: 'white'}}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
