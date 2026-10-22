'use client';

import {Suspense, useEffect, useState} from 'react';
import {useSearchParams, useRouter} from 'next/navigation';
import {CheckCircle2, Loader2, XCircle} from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';

function PaymentLinkCompleteContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const reference = params.get('reference') ?? params.get('trxref');
  const [state, setState] = useState<'loading'|'success'|'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!token || !reference) {
        setState('error'); setMessage('The payment callback is missing required details. Contact support before paying again.'); return;
      }
      const supabase = getBrowserSupabase();
      const {data, error} = await supabase.functions.invoke('verify-order-payment-link', {body: {token, reference}});
      if (cancelled) return;
      if (error || !data?.success) {
        setState('error');
        setMessage(data?.error ?? error?.message ?? 'Payment could not be confirmed. Check with support before trying to pay again.');
        return;
      }
      setState('success');
      setMessage('Payment confirmed. Your order is now marked as paid.');
    }
    verify().catch(() => {
      if (!cancelled) { setState('error'); setMessage('We could not verify this payment. Please contact support before retrying.'); }
    });
    return () => { cancelled = true; };
  }, [token, reference]);

  return <main className="max-w-md mx-auto px-4 py-16 text-center">
    {state === 'loading' && <><Loader2 className="w-8 h-8 mx-auto animate-spin" style={{color:'var(--orange)'}}/><h1 className="font-display font-semibold mt-4" style={{color:'var(--ink)'}}>Confirming payment…</h1></>}
    {state === 'success' && <><CheckCircle2 className="w-10 h-10 mx-auto" style={{color:'var(--orange)'}}/><h1 className="font-display font-semibold mt-4" style={{color:'var(--ink)'}}>Payment confirmed</h1><p className="text-sm mt-2" style={{color:'var(--gray)'}}>{message}</p><button onClick={() => router.push('/order/orders')} className="w-full mt-6 rounded-xl py-3 text-sm font-semibold text-white" style={{background:'var(--orange)'}}>View my orders</button></>}
    {state === 'error' && <><XCircle className="w-10 h-10 mx-auto" style={{color:'#C1453A'}}/><h1 className="font-display font-semibold mt-4" style={{color:'var(--ink)'}}>Payment needs checking</h1><p className="text-sm mt-2" style={{color:'var(--gray)'}}>{message}</p><button onClick={() => router.push('/order/orders')} className="w-full mt-6 rounded-xl py-3 text-sm font-semibold" style={{color:'var(--orange)'}}>View my orders</button></>}
  </main>;
}

export default function PaymentLinkCompletePage() {
  return <Suspense fallback={<div className="py-16 text-center">Loading payment status…</div>}><PaymentLinkCompleteContent /></Suspense>;
}
