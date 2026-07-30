'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Loader2, Eye, EyeOff} from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';
import EmailVerifyField from '@/components/restaurant/onboarding/EmailVerifyField';

export default function CustomerSignupPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [finishing, setFinishing] = useState(false);

  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canContinue = !!fullName && !!phone && emailVerified && passwordSet;

  // Same pattern as restaurant/rider signup: EmailVerifyField's OTP flow
  // already creates the Supabase Auth session (and the profiles row, with
  // full_name/phone) on successful verification — this just attaches a
  // password to that same account afterward.
  async function handleSetPassword() {
    if (!passwordValid || !passwordsMatch) return;
    setSavingPassword(true);
    setPasswordError(null);
    try {
      const {error} = await supabase.auth.updateUser({password});
      if (error) throw error;
      setPasswordSet(true);
    } catch (e: any) {
      setPasswordError(e?.message ?? 'Could not set your password — try again.');
    } finally {
      setSavingPassword(false);
    }
  }

  function handleContinue() {
    setFinishing(true);
    router.push('/order');
  }

  return (
    <div className="w-full max-w-[380px] mx-auto px-4 py-12">
      <h1 className="font-display text-[19px] font-semibold" style={{color: 'var(--ink)'}}>
        Create your account
      </h1>
      <p className="text-[12.5px] mt-1 mb-5" style={{color: 'var(--gray)'}}>
        Order from restaurants near you in minutes.
      </p>

      <div className="mb-3.5">
        <label className="block text-[12px] font-medium mb-1.5" style={{color: 'var(--ink)'}}>
          Full name
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
          style={{border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)'}}
        />
      </div>

      <div className="mb-3.5">
        <label className="block text-[12px] font-medium mb-1.5" style={{color: 'var(--ink)'}}>
          Phone number
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="080X XXX XXXX"
          type="tel"
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
          style={{border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)'}}
        />
      </div>

      <div className="mb-1">
        <label className="block text-[12px] font-medium mb-1.5" style={{color: 'var(--ink)'}}>
          Email
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
          style={{border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)'}}
        />
        <EmailVerifyField
          email={email}
          fullName={fullName}
          phone={phone}
          verified={emailVerified}
          onVerified={() => setEmailVerified(true)}
          purpose="customer_signup"
        />
        <p className="text-[11px] mt-1.5" style={{color: 'var(--gray)'}}>
          Don't see the code? Check your spam or junk folder.
        </p>
      </div>

      {emailVerified && (
        <div className="mb-5 mt-3.5">
          <label className="block text-[12px] font-medium mb-1.5" style={{color: 'var(--ink)'}}>
            Set a password
          </label>

          {passwordSet ? (
            <p className="text-[11.5px]" style={{color: 'var(--green, #1F8A5C)'}}>
              ✓ Password set
            </p>
          ) : (
            <>
              <div className="relative mb-2">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2.5 pr-10 rounded-[9px] text-[13px] outline-none"
                  style={{border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)'}}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{color: 'var(--gray)'}}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none mb-2"
                style={{border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)'}}
              />

              {password.length > 0 && !passwordValid && (
                <p className="text-[11px] mb-1.5" style={{color: 'var(--red, #C1453A)'}}>
                  Password must be at least 8 characters.
                </p>
              )}
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[11px] mb-1.5" style={{color: 'var(--red, #C1453A)'}}>
                  Passwords don't match.
                </p>
              )}
              {passwordError && (
                <p className="text-[11px] mb-1.5" style={{color: 'var(--red, #C1453A)'}}>
                  {passwordError}
                </p>
              )}

              <button
                type="button"
                onClick={handleSetPassword}
                disabled={!passwordValid || !passwordsMatch || savingPassword}
                className="w-full py-2.5 rounded-[9px] text-[12.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
                style={{background: 'var(--orange)'}}
              >
                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Set password
              </button>
            </>
          )}
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!canContinue || finishing}
        className="w-full py-3.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40"
        style={{background: 'var(--orange)'}}
      >
        {finishing ? 'Taking you in…' : 'Create account'}
      </button>

      <p className="text-[12.5px] text-center mt-5" style={{color: 'var(--gray)'}}>
        Already have an account?{' '}
        <Link href="/order/login" className="font-semibold" style={{color: 'var(--orange)'}}>
          Log in
        </Link>
      </p>
    </div>
  );
}
