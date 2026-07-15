'use client';

import { useCallback, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

type PaymentType = 'verification_fee' | 'promotion' | 'rider_verification_fee';
type Status = 'idle' | 'starting' | 'redirecting' | 'verifying' | 'success' | 'error';

export default function usePaystackPayment() {
  const supabase = getBrowserSupabase();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const startPayment = useCallback(
    async (type: PaymentType) => {
      setStatus('starting');
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('paystack-initialize', {
          body: { type, callbackOrigin: window.location.origin },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        setStatus('redirecting');
        window.location.href = data.authorization_url;
      } catch (e: any) {
        setStatus('error');
        setError(e?.message ?? 'Could not start the payment.');
      }
    },
    [supabase]
  );

  const verifyPayment = useCallback(
    async (reference: string) => {
      setStatus('verifying');
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('paystack-verify', {
          body: { reference },
        });
        if (fnError) throw fnError;
        if (data?.error || data?.success === false) {
          throw new Error(data?.error ?? 'Payment was not successful.');
        }
        setStatus('success');
        return { success: true, type: data.type as PaymentType };
      } catch (e: any) {
        setStatus('error');
        setError(e?.message ?? 'Could not verify the payment.');
        return { success: false, type: null };
      }
    },
    [supabase]
  );

  return { status, error, startPayment, verifyPayment };
}
