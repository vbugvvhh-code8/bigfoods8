'use client';

import { useState } from 'react';
import useEmailVerification from '@/hooks/useEmailVerification';

type Purpose = 'customer_signup' | 'restaurant_signup' | 'rider_signup';

export default function AccountEmailVerification({
  email, verified, purpose,
}: { email: string; verified: boolean; purpose: Purpose }) {
  const { status, error, cooldown, sendCode, verifyCode } = useEmailVerification(email, undefined, undefined, purpose);
  const [code, setCode] = useState('');

  if (verified || status === 'verified') {
    return <div className="mt-3 rounded-xl border px-3 py-3 text-[12px]" style={{ borderColor: 'var(--line)', color: 'var(--green)' }}>✓ Email address verified</div>;
  }

  return (
    <div className="mt-4 rounded-xl border p-3 space-y-2.5" style={{ borderColor: 'var(--line)', background: 'var(--peach, #fff8f2)' }}>
      <div>
        <p className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>Email not verified</p>
        <p className="text-[11.5px] mt-1" style={{ color: 'var(--gray)' }}>Verify your email to help secure your account. You can continue using your account for now.</p>
      </div>
      {status !== 'sent' && status !== 'verifying' && (
        <button type="button" onClick={sendCode} disabled={!email || cooldown > 0 || status === 'sending'} className="text-[12px] font-semibold rounded-lg px-3 py-2 text-white disabled:opacity-50" style={{ background: 'var(--orange)' }}>
          {status === 'sending' ? 'Sending code…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send verification code'}
        </button>
      )}
      {(status === 'sent' || status === 'verifying' || (status === 'error' && code.length > 0)) && (
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-[12px] tracking-widest" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }} />
          <button type="button" disabled={code.length !== 6 || status === 'verifying'} onClick={async () => { const ok = await verifyCode(code); if (ok) setCode(''); }} className="rounded-lg px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50" style={{ background: 'var(--orange)' }}>
            {status === 'verifying' ? 'Checking…' : 'Verify'}
          </button>
        </div>
      )}
      {status === 'sent' && <p className="text-[11px]" style={{ color: 'var(--gray)' }}>A verification code has been sent to {email}.</p>}
      {error && <p className="text-[11px]" style={{ color: 'var(--red)' }}>{error}</p>}
    </div>
  );
}
