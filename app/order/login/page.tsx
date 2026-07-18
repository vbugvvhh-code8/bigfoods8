'use client';

import {Suspense, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Mail, ArrowLeft} from 'lucide-react';
import useCustomerAuth from '@/hooks/useCustomerAuth';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/order';

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const {status, error, cooldown, sendCode, verifyCode} = useCustomerAuth(email);

  const handleSendCode = async () => {
    await sendCode();
    setStep('code');
  };

  const handleVerify = async () => {
    const ok = await verifyCode(code);
    if (ok) router.replace(next);
  };

  const isBusy = status === 'sending' || status === 'verifying';

  return (
    <div className="w-full max-w-[380px] mx-auto px-4 py-12">
      {step === 'code' && (
        <button onClick={() => setStep('email')} className="flex items-center gap-2.5 mb-4" style={{color: 'var(--gray)'}}>
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[12.5px]">Change email</span>
        </button>
      )}

      <div
        className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
        style={{background: 'var(--peach)', color: 'var(--orange)'}}
      >
        <Mail className="w-5 h-5" />
      </div>

      <h1 className="font-display text-[19px] font-semibold" style={{color: 'var(--ink)'}}>
        {step === 'email' ? 'Log in or sign up' : 'Enter your code'}
      </h1>
      <p className="text-[12.5px] mt-1 leading-relaxed" style={{color: 'var(--gray)'}}>
        {step === 'email'
          ? "We'll email you a one-time code — no password needed."
          : `We sent a 6-digit code to ${email}.`}
      </p>

      {step === 'email' ? (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && email && handleSendCode()}
            placeholder="you@example.com"
            className="w-full mt-5 rounded-xl px-4 py-3 text-[13px] outline-none"
            style={{background: 'var(--peach)', color: 'var(--ink)'}}
            autoFocus
          />
          <button
            onClick={handleSendCode}
            disabled={!email || isBusy}
            className="w-full mt-3 py-3 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50"
            style={{background: 'var(--orange)'}}
          >
            {status === 'sending' ? 'Sending…' : 'Send code'}
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && handleVerify()}
            placeholder="000000"
            className="w-full mt-5 rounded-xl px-4 py-3 text-[20px] tracking-[0.3em] text-center outline-none"
            style={{background: 'var(--peach)', color: 'var(--ink)'}}
            autoFocus
          />
          <button
            onClick={handleVerify}
            disabled={code.length !== 6 || isBusy}
            className="w-full mt-3 py-3 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50"
            style={{background: 'var(--orange)'}}
          >
            {status === 'verifying' ? 'Verifying…' : 'Verify & continue'}
          </button>
          <button
            onClick={handleSendCode}
            disabled={cooldown > 0 || isBusy}
            className="w-full mt-2 py-2 text-[12px] font-medium disabled:opacity-50"
            style={{color: 'var(--gray)'}}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </>
      )}

      {error && (
        <p className="text-[12px] mt-3 text-center" style={{color: 'var(--red, #C1453A)'}}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-[380px] mx-auto px-4 py-8 text-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
