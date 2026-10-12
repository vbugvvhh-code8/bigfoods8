'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import useOnboardingSession, { stepLabel, stepPath } from '@/hooks/useOnboardingSession';
import useAcceptedBanks from '@/hooks/useAcceptedBanks';
import getBrowserSupabase from '@/lib/supabase/client';
import { extractEdgeFunctionError } from '@/lib/extractEdgeFunctionError';

interface SavedAccount {
  account_name: string;
  account_number: string;
  bank_name: string;
}

export default function BankPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const { hydrated } = useOnboardingSession();
  const { banks, loading: banksLoading } = useAcceptedBanks();

  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [saved, setSaved] = useState<SavedAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // If a verified account was already saved (e.g. they came back to this step),
  // show it instead of asking again.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setChecking(false);
      const { data: restaurant } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).maybeSingle();
      if (restaurant) {
        const { data: account } = await supabase
          .from('restaurant_bank_accounts')
          .select('account_name, account_number, bank_name')
          .eq('restaurant_id', restaurant.id)
          .maybeSingle();
        if (!cancelled && account) setSaved(account as SavedAccount);
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (!hydrated || checking || banksLoading) {
    return (
      <p className="text-[12.5px] py-6 text-center" style={{ color: 'var(--gray)' }}>
        Loading…
      </p>
    );
  }

  const numberValid = /^\d{10}$/.test(accountNumber);

  async function handleVerify() {
    setSaving(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('restaurant-save-bank-account', {
        body: { account_number: accountNumber, bank_code: bankCode },
      });
      if (fnError) {
        setError(await extractEdgeFunctionError(fnError, 'Could not verify this account.'));
        return;
      }
      if (data?.error) {
        setError(data.error);
        return;
      }
      setSaved(data.bankAccount as SavedAccount);
    } catch (e: any) {
      setError(e?.message ?? 'Could not verify this account.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        {stepLabel('bank')}
      </p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Where should we pay you?
      </h2>
      <p className="text-[12.5px] mb-5" style={{ color: 'var(--gray)' }}>
        The account must be in your own name. We check it with your bank.
      </p>

      {saved ? (
        <div className="p-4 rounded-[12px] mb-5" style={{ border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-1.5 text-[12.5px] mb-2" style={{ color: 'var(--green)' }}>
            <CheckCircle2 className="w-4 h-4" /> Account verified
          </div>
          <p className="text-[13.5px] font-semibold">{saved.account_name}</p>
          <p className="text-[12px]" style={{ color: 'var(--gray)' }}>
            {saved.bank_name} · ending {saved.account_number.slice(-4)}
          </p>
          <button
            type="button"
            onClick={() => setSaved(null)}
            className="text-[11.5px] mt-2 underline"
            style={{ color: 'var(--gray)' }}
          >
            Use a different account
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3.5">
            <label htmlFor="bank" className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
              Bank
            </label>
            <select
              id="bank"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
            >
              <option value="">Select your bank</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3.5">
            <label htmlFor="acct" className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
              Account number
            </label>
            <input
              id="acct"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="10 digits"
              className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
            />
          </div>

          {error && (
            <p className="text-[11.5px] mb-3" style={{ color: 'var(--red)' }} role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleVerify}
            disabled={!bankCode || !numberValid || saving}
            className="w-full py-3 rounded-[9px] text-[13px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 mb-5"
            style={{ background: 'var(--ink)' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Verify account
          </button>
        </>
      )}

      <button
        onClick={() => router.push(stepPath('payment'))}
        disabled={!saved}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40"
        style={{ background: 'var(--orange)' }}
      >
        Continue
      </button>
    </>
  );
}
