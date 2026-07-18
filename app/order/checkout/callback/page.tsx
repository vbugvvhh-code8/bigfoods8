'use client';

import {Suspense, useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {CheckCircle2, XCircle, Loader2} from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';
import {useCart} from '@/hooks/useCart';
import {AuthGate} from '@/components/customer/shell/AuthGate';

type Status = 'verifying' | 'success' | 'failed';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const {clearCart} = useCart();
  const supabase = getBrowserSupabase();

  const [status, setStatus] = useState<Status>('verifying');
  const [result, setResult] = useState<{order_id?: string; delivery_code?: string; error?: string}>({});

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      setResult({error: 'Missing payment reference.'});
      return;
    }

    let cancelled = false;

    supabase.functions
      .invoke('verify-order-payment', {body: {reference}})
      .then(({data, error}) => {
        if (cancelled) return;
        if (error || data?.error || !data?.success) {
          setStatus('failed');
          setResult({error: data?.error ?? error?.message ?? 'Payment could not be verified.'});
          return;
        }
        clearCart();
        setStatus('success');
        setResult({order_id: data.order_id, delivery_code: data.delivery_code});
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  return (
    <div className="w-full max-w-[380px] mx-auto px-4 py-16 text-center">
      {status === 'verifying' && (
        <>
          <Loader2 className="w-8 h-8 mx-auto animate-spin" style={{color: 'var(--orange)'}} />
          <p className="font-display font-semibold text-[14px] mt-3" style={{color: 'var(--ink)'}}>
            Confirming your payment…
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle2 className="w-10 h-10 mx-auto" style={{color: 'var(--orange)'}} />
          <p className="font-display font-semibold text-[16px] mt-3" style={{color: 'var(--ink)'}}>
            Order placed!
          </p>
          <p className="text-[12.5px] mt-1" style={{color: 'var(--gray)'}}>
            Give your rider this code at delivery:
          </p>
          <p className="font-display text-[24px] font-bold mt-2 tracking-widest" style={{color: 'var(--orange)'}}>
            {result.delivery_code}
          </p>
          <button
            onClick={() => router.push(`/order/track/${result.order_id}`)}
            className="w-full mt-6 py-3 rounded-xl text-[13px] font-semibold text-white"
            style={{background: 'var(--orange)'}}
          >
            Track my order
          </button>
          <button
            onClick={() => router.push('/order')}
            className="w-full mt-2 py-3 rounded-xl text-[13px] font-semibold"
            style={{color: 'var(--gray)'}}
          >
            Back to Home
          </button>
        </>
      )}

      {status === 'failed' && (
        <>
          <XCircle className="w-10 h-10 mx-auto" style={{color: 'var(--red, #C1453A)'}} />
          <p className="font-display font-semibold text-[16px] mt-3" style={{color: 'var(--ink)'}}>
            Payment didn&apos;t go through
          </p>
          <p className="text-[12.5px] mt-1" style={{color: 'var(--gray)'}}>
            {result.error}
          </p>
          <button
            onClick={() => router.push('/order/checkout')}
            className="w-full mt-6 py-3 rounded-xl text-[13px] font-semibold text-white"
            style={{background: 'var(--orange)'}}
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}

export default function CheckoutCallbackPage() {
  return (
    <AuthGate>
      <Suspense fallback={<div className="max-w-[380px] mx-auto px-4 py-8 text-center">Loading...</div>}>
        <CallbackContent />
      </Suspense>
    </AuthGate>
  );
}
