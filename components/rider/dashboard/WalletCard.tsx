'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, Pencil } from 'lucide-react';
import useRiderWallet from '@/hooks/useRiderWallet';
import usePricingConfig from '@/hooks/usePricingConfig';
import { NIGERIAN_BANKS } from '@/lib/nigerianBanks';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'var(--orange)' },
  processing: { label: 'Processing', color: 'var(--orange)' },
  paid: { label: 'Paid', color: 'var(--green)' },
  rejected: { label: 'Rejected', color: 'var(--red)' },
};

export default function RiderWalletCard({ riderId }: { riderId: string }) {
  const {
    payouts,
    bankAccount,
    balance,
    loading,
    error,
    hasOpenRequest,
    requesting,
    savingBank,
    requestPayout,
    saveBankAccount,
    confirmBankChange,
  } = useRiderWallet(riderId);
  const { prices } = usePricingConfig(['rider_payout_minimum']);
  const minWithdrawal = prices.rider_payout_minimum ?? 50000;

  const [editingBank, setEditingBank] = useState(false);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState('');

  const belowMinimum = balance < minWithdrawal;
  const canWithdraw = !belowMinimum && !!bankAccount?.verified && !hasOpenRequest;

  async function handleSaveBank() {
    const bank = NIGERIAN_BANKS.find((b) => b.code === bankCode);
    if (!bank || accountNumber.length < 10) return;
    const result = await saveBankAccount({ account_number: accountNumber, bank_code: bank.code, bank_name: bank.name });
    if (result.requiresCode) {
      setAwaitingCode(true);
      return;
    }
    if (result.ok) {
      setEditingBank(false);
      setAccountNumber('');
      setBankCode('');
    }
  }

  async function handleConfirmCode() {
    const bank = NIGERIAN_BANKS.find((b) => b.code === bankCode);
    if (!bank || code.length !== 6) return;
    const ok = await confirmBankChange({ code, account_number: accountNumber, bank_code: bank.code, bank_name: bank.name });
    if (ok) {
      setEditingBank(false);
      setAwaitingCode(false);
      setAccountNumber('');
      setBankCode('');
      setCode('');
    }
  }

  if (loading) {
    return (
      <p className="text-[12.5px] py-4 text-center" style={{ color: 'var(--gray)' }}>
        Loading wallet…
      </p>
    );
  }

  return (
    <div>
      <div className="p-4 rounded-[12px] mb-4" style={{ background: 'var(--peach)' }}>
        <p className="text-[11.5px] mb-1" style={{ color: 'var(--gray)' }}>Available balance</p>
        <p className="text-[22px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          ₦{balance.toLocaleString()}
        </p>
      </div>

      {/* Withdrawal account */}
      <div className="p-3.5 rounded-[10px] mb-4" style={{ border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>Withdrawal account</p>
          {bankAccount && !editingBank && (
            <button onClick={() => setEditingBank(true)} style={{ color: 'var(--gray)' }} aria-label="Change withdrawal account">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {bankAccount && !editingBank ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--green)' }} />
            <p className="text-[12px]" style={{ color: 'var(--ink)' }}>
              {bankAccount.bank_name} · ****{bankAccount.account_number.slice(-4)} · {bankAccount.account_name}
            </p>
          </div>
        ) : awaitingCode ? (
          <div className="space-y-2 mt-1.5">
            <p className="text-[11px]" style={{ color: 'var(--gray)' }}>
              We emailed you a 6-digit code to confirm this change.
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              inputMode="numeric"
              className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none tracking-widest"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setAwaitingCode(false); setEditingBank(false); setCode(''); }}
                className="flex-1 py-2.5 rounded-[9px] text-[12px] font-semibold"
                style={{ border: '1px solid var(--line)', color: 'var(--gray)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCode}
                disabled={code.length !== 6 || savingBank}
                className="flex-1 py-2.5 rounded-[9px] text-[12px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
                style={{ background: 'var(--orange)' }}
              >
                {savingBank ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Confirm
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mt-1.5">
            <p className="text-[11px]" style={{ color: 'var(--gray)' }}>
              The account name must match your own registered name to be accepted.
            </p>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none bg-white"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              <option value="" disabled>Select bank</option>
              {NIGERIAN_BANKS.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit account number"
              inputMode="numeric"
              className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
            />
            <div className="flex gap-2">
              {bankAccount && (
                <button
                  onClick={() => setEditingBank(false)}
                  className="flex-1 py-2.5 rounded-[9px] text-[12px] font-semibold"
                  style={{ border: '1px solid var(--line)', color: 'var(--gray)' }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSaveBank}
                disabled={!bankCode || accountNumber.length < 10 || savingBank}
                className="flex-1 py-2.5 rounded-[9px] text-[12px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
                style={{ background: 'var(--orange)' }}
              >
                {savingBank ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Verify &amp; save
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--red)' }}>{error}</p>
        )}
      </div>

      {/* Withdraw -- pays out the full available balance, no partial amount */}
      <div className="mb-4">
        <button
          onClick={requestPayout}
          disabled={!canWithdraw || requesting}
          className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'var(--orange)' }}
        >
          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Withdraw ₦{balance.toLocaleString()}
        </button>

        {belowMinimum && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--gray)' }}>
            Minimum withdrawal is ₦{minWithdrawal.toLocaleString()}.
          </p>
        )}
        {!bankAccount?.verified && !belowMinimum && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--red)' }}>
            Add a verified withdrawal account above first.
          </p>
        )}
        {hasOpenRequest && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--gray)' }}>
            You have a withdrawal request awaiting payment.
          </p>
        )}
      </div>

      <p className="text-[11.5px] font-medium mb-2" style={{ color: 'var(--gray)' }}>Recent requests</p>
      {payouts.length === 0 ? (
        <p className="text-[12px]" style={{ color: 'var(--gray)' }}>No withdrawal requests yet.</p>
      ) : (
        <div className="space-y-2">
          {payouts.map((p: any) => {
            const status = STATUS_LABEL[p.status ?? 'pending'] ?? { label: p.status, color: 'var(--gray)' };
            return (
              <div key={p.id} className="p-2.5 rounded-[8px]" style={{ border: '1px solid var(--line)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px]">₦{Number(p.amount).toLocaleString()}</span>
                  <span className="text-[11px] font-medium" style={{ color: status.color }}>
                    {status.label}
                  </span>
                </div>
                {p.status === 'rejected' && p.rejection_reason && (
                  <p className="text-[10.5px] mt-1" style={{ color: 'var(--red)' }}>
                    {p.rejection_reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
