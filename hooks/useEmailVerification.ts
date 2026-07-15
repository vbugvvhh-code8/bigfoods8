'use client';

import { useCallback, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

type Status = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Wired to the live `send-email-otp` / `verify-email-otp` Edge Functions.
 * `purpose` defaults to 'restaurant_signup' so existing restaurant call sites
 * are unaffected; pass 'customer_signup' or 'rider_signup' explicitly for
 * those flows — the edge functions map purpose to profiles.role.
 * On a correct code, `verify-email-otp` returns a magic-link token_hash; this
 * hook redeems it via supabase.auth.verifyOtp so the user has a real
 * session from this point on (needed for owner/profile-scoped RLS in later
 * steps). Note: RESEND_API_KEY must be set in the project's Edge Function
 * secrets for emails to actually send — until then the code is generated and
 * stored but only logged, not delivered.
 */
export default function useEmailVerification(
  email: string,
  fullName?: string,
  phone?: string,
  purpose: 'customer_signup' | 'restaurant_signup' | 'rider_signup' = 'restaurant_signup'
) {
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
      const { data, error: fnError } = await supabase.functions.invoke('send-email-otp', {
        body: { email, purpose },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setStatus('sent');
      startCooldown();
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Could not send the code — try again in a moment.');
    }
  }, [email, cooldown, purpose, supabase, startCooldown]);

  const verifyCode = useCallback(
    async (code: string) => {
      setStatus('verifying');
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('verify-email-otp', {
          body: { email, code, purpose, fullName, phone },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        if (data?.token_hash) {
          const { error: sessionError } = await supabase.auth.verifyOtp({
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
    [email, fullName, phone, purpose, supabase]
  );

  return { status, error, cooldown, sendCode, verifyCode };
}
