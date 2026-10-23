'use client';

import {useEffect, useState} from 'react';
import {useParams} from 'next/navigation';
import {Loader2, XCircle} from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';

export default function PayByLinkPage() {
  const params = useParams<{token: string}>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function redeem() {
      const supabase = getBrowserSupabase();
      const {data, error: invokeError} = await supabase.functions.invoke('redeem-order-payment-link', {
        body: {token: params.token, callbackOrigin: window.location.origin},
      });
      if (cancelled) return;
      if (invokeError || !data?.success || !data?.authorization_url) {
        setError(data?.error ?? invokeError?.message ?? 'This payment link cannot be used.');
        setBusy(false);
        return;
      }
      window.location.assign(data.authorization_url);
    }
    redeem().catch(() => {
      if (!cancelled) { setError('Unable to open this payment link.'); setBusy(false); }
    });
    return () => { cancelled = true; };
  }, [params.token]);

  return <main className="max-w-md mx-auto px-4 py-16 text-center">
    {busy ? <><Loader2 className="w-8 h-8 mx-auto animate-spin" style={{color:'var(--orange)'}}/><h1 className="font-display font-semibold mt-4" style={{color:'var(--ink)'}}>Opening secure payment…</h1><p className="text-sm mt-2" style={{color:'var(--gray)'}}>You will be redirected to Paystack.</p></> :
      <><XCircle className="w-9 h-9 mx-auto" style={{color:'#C1453A'}}/><h1 className="font-display font-semibold mt-4" style={{color:'var(--ink)'}}>Payment link unavailable</h1><p className="text-sm mt-2" style={{color:'var(--gray)'}}>{error}</p><p className="text-xs mt-4" style={{color:'var(--gray)'}}>Ask the person who shared the link to check its status or create a new one.</p></>}
  </main>;
}
