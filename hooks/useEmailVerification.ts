'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const [cooldownExpireAt, setCooldownExpireAt] = useState<number | null>(null);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Compute cooldown in seconds from expiry timestamp
  const cooldown = cooldownExpireAt
    ? Math.max(0, Math.ceil((cooldownExpireAt - Date.now()) / 1000))
    : 0;

  const startCooldown = useCallback(() => {
    setCooldownExpireAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
  }, []);

  // Set up a ticker to force re-renders while cooldown is active
  useEffect(() => {
    if (cooldownExpireAt === null) {
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      return;
    }

    const id = setInterval(() => {
      // Force re-render by checking remaining time
      const remaining = cooldownExpireAt ? Math.max(0, Math.ceil((cooldownExpireAt - Date.now()) / 1000)) : 0;
      if (remaining <= 0) {
        clearInterval(id);
        setCooldownExpireAt(null);
        setIntervalId(null);
      }
    }, 1000);

    setIntervalId(id);

    // Cleanup on unmount
    return () => {
      clearInterval(id);
      setIntervalId(null);
    };
  }, [cooldownExpireAt, intervalId]);

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

        // FIX 1: Validate token_hash exists before attempting session creation
        if (!data?.token_hash) {
          throw new Error('Verification failed: no token received from server.');
        }

        // FIX 2: Use correct verifyOtp signature - token_hash only (not email + token)
        const { error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'email',
        });
        if (sessionError) throw sessionError;

        // FIX 3: Validate session was actually established
        const { data: sessionData, error: sessionCheckError } = await supabase.auth.getSession();
        if (sessionCheckError || !sessionData.session) {
          throw new Error('Session was not established. Please try again.');
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
