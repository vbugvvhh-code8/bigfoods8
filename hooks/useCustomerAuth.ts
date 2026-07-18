'use client';

import {useCallback, useState} from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

type Status = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Customer-specific wrapper around send-email-otp / verify-email-otp.
 *
 * Deliberately NOT a reuse of hooks/useEmailVerification.ts (the restaurant
 * onboarding hook) — that hook omits `purpose` entirely, and both Edge
 * Functions default `purpose` to 'restaurant_signup' when it's missing.
 * Reusing it as-is would silently register every customer with
 * role: 'restaurant'. This hook always sends purpose: 'customer_signup',
 * and uses `full_name` (snake_case) to match what verify-email-otp actually
 * reads from the request body.
 *
 * Note: if the email already belongs to an existing account (e.g. someone
 * who signed up as a restaurant owner first), verify-email-otp logs them
 * into that existing account/role rather than creating a second profile —
 * one email maps to one account across all three portals.
 */
export default function useCustomerAuth(email: string, fullName?: string, phone?: string) {
  const supabase = getBrowserSupabase();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  const sendCode = useCallback(async () => {
    if (!email || cooldown > 0) return;
    setStatus('sending');
    setError(null);
    try {
      const {data, error: fnError} = await supabase.functions.invoke('send-email-otp', {
        body: {email, purpose: 'customer_signup'},
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setStatus('sent');
      startCooldown();
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Could not send the code — try again in a moment.');
    }
  }, [email, cooldown, supabase, startCooldown]);

  const verifyCode = useCallback(
    async (code: string) => {
      setStatus('verifying');
      setError(null);
      try {
        const {data, error: fnError} = await supabase.functions.invoke('verify-email-otp', {
          body: {email, code, purpose: 'customer_signup', full_name: fullName, phone},
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        if (data?.token_hash) {
          const {error: sessionError} = await supabase.auth.verifyOtp({
            email,
            token: data.token_hash,
            type: 'email',
          });
          if (sessionError) throw sessionError;
        }

        setStatus('verified');
        return true;
      } catch (e: any) {
        setStatus('error');
        setError(e?.message ?? 'Could not verify that code — try again.');
        return false;
      }
    },
    [email, fullName, phone, supabase]
  );

  return {status, error, cooldown, sendCode, verifyCode};
}
