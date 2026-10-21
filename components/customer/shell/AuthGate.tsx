'use client';

import {useEffect, useState} from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import {useRouter, usePathname} from 'next/navigation';
import useSession from '@/hooks/useSession';

export function AuthGate({children}: {children: React.ReactNode}) {
  const {user, loading} = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sessionConfirmed, setSessionConfirmed] = useState(false);
  const supabase = getBrowserSupabase();

  useEffect(() => {
    let cancelled = false;
    if (loading || user) {
      setSessionConfirmed(!!user);
      return;
    }

    // useSession's getUser() can temporarily fail during a network/token refresh.
    // Check the persisted browser session before redirecting a customer to login.
    async function confirmSession() {
      try {
        const {data, error} = await supabase.auth.getSession();
        if (cancelled) return;
        if (!error && data.session?.user) {
          setSessionConfirmed(true);
          return;
        }
      } catch {
        // Treat an unavailable auth check as unresolved rather than logging the customer out.
        if (!cancelled) return;
      }
      if (!cancelled) {
        router.replace(`/order/login?next=${encodeURIComponent(pathname ?? '/order')}`);
      }
    }
    confirmSession();
    return () => { cancelled = true; };
  }, [loading, user, pathname, router, supabase]);

  if (loading || (!user && !sessionConfirmed)) {
    return (
      <div className="max-w-[380px] lg:max-w-2xl mx-auto px-4 py-8 space-y-3" aria-busy="true">
        <div className="h-5 w-32 rounded-md animate-pulse" style={{background: 'var(--peach)'}} />
        <div className="h-20 rounded-2xl animate-pulse" style={{background: 'var(--peach)'}} />
        <div className="h-20 rounded-2xl animate-pulse" style={{background: 'var(--peach)'}} />
      </div>
    );
  }

  if (!user && !sessionConfirmed) return null;

  return <>{children}</>;
}
