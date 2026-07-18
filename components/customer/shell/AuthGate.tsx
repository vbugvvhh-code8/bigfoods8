'use client';

import {useEffect} from 'react';
import {useRouter, usePathname} from 'next/navigation';
import useSession from '@/hooks/useSession';

export function AuthGate({children}: {children: React.ReactNode}) {
  const {user, loading} = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/order/login?next=${encodeURIComponent(pathname ?? '/order')}`);
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="max-w-[380px] lg:max-w-2xl mx-auto px-4 py-8 space-y-3" aria-busy="true">
        <div className="h-5 w-32 rounded-md animate-pulse" style={{background: 'var(--peach)'}} />
        <div className="h-20 rounded-2xl animate-pulse" style={{background: 'var(--peach)'}} />
        <div className="h-20 rounded-2xl animate-pulse" style={{background: 'var(--peach)'}} />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
