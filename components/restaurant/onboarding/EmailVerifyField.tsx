'use client';

import { useEffect } from 'react';
import useEmailVerification from '@/hooks/useEmailVerification';
import useOnboardingSession from '@/hooks/useOnboardingSession';

interface EmailVerifyFieldProps {
  email: string;
  fullName?: string;
  phone?: string;
  verified: boolean;
  onVerified: () => void;
  purpose?: 'customer_signup' | 'restaurant_signup' | 'rider_signup';
}

export default function EmailVerifyField({ email, fullName, phone, verified, onVerified, purpose }: EmailVerifyFieldProps) {
  const { status, error, cooldown, sendCode, verifyCode } = useEmailVerification(email, fullName, phone, purpose);
  const { otpState, updateOtpState } = useOnboardingSession();
  
  // FIX 5: Use persisted code from onboarding session instead of local state
  const code = otpState.code ?? '';

  const codeVisible = status === 'sent' || status === 'verifying' || (status === 'error' && code.length > 0);
  const emailValid = /\S+@\S+\.\S+/.test(email);

  // FIX 6: Clear stale code and error when email changes
  useEffect(() => {
    // Store the email that was used for the current OTP request
    const lastEmailForOtp = otpState.lastEmailForOtp;
    
    if (email && lastEmailForOtp && email !== lastEmailForOtp) {
      // Email changed — clear code, error, and status
      updateOtpState({ 
        code: '', 
        otpError: null, 
        otpStatus: 'idle',
        lastEmailForOtp: email 
      });
    } else if (email && !lastEmailForOtp) {
      // First time setting the email
      updateOtpState({ lastEmailForOtp: email });
    }
  }, [email, otpState, updateOtpState]);

  async function handleVerify() {
    const ok = await verifyCode(code);
    if (ok) {
      onVerified();
      // Clear OTP state on successful verification
      updateOtpState({ code: '', otpStatus: 'verified', otpError: null });
    }
  }

  if (verified) {
    return (
      <p className="text-[11.5px] mt-1.5" style={{ color: 'var(--green)' }}>
        ✓ Email verified
      </p>
    );
  }

  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px]" style={{ color: 'var(--gray)' }}>
          Verify your email to continue
        </p>
        <button
          type="button"
          disabled={!emailValid || cooldown > 0 || status === 'sending'}
          onClick={sendCode}
          className="text-[11.5px] font-semibold whitespace-nowrap disabled:opacity-40"
          style={{ color: 'var(--orange)' }}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : status === 'sending' ? 'Sending…' : 'Verify now'}
        </button>
      </div>

      {codeVisible && (
        <div className="mt-2.5">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => updateOtpState({ code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              placeholder="6-digit code"
              inputMode="numeric"
              className="flex-1 px-3 py-2.5 rounded-[9px] text-[13px] outline-none tracking-widest"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={code.length !== 6 || status === 'verifying'}
              className="px-4 rounded-[9px] text-[12.5px] font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--orange)' }}
            >
              {status === 'verifying' ? 'Checking…' : 'Confirm'}
            </button>
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--gray)' }}>
            Code expires in 10 minutes.
          </p>
        </div>
      )}

      {error && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--red)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
