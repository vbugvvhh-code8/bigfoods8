'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, Pencil } from 'lucide-react';
import useWallet, { MIN_WITHDRAWAL } from '@/hooks/useWallet';
import { NIGERIAN_BANKS } from '@/lib/nigerianBanks';

interface WalletCardProps {
  restaurantId: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'var(--orange)' },
  processing: { label: 'Processing', color: 'var(--orange)' },
  paid: { label: 'Paid', color: 'var(--green)' },
  rejected: { label: 'Rejected', color: 'var(--red)' },
};

export default function WalletCard({ restaurantId }: WalletCardProps) {
  const {
    payouts,
    bankAccount,
    estimatedBalance,
    loading,
    error,
    hasUnpaidRequest,
    requestPayout,
    saveBankAccount,
    estimateBreakdown,
  } = useWallet(restaurantId);

  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingBank, setEditingBank] = useState(false);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  const numericAmount = Number(amount);
  const belowMinimum = numericAmount > 0 && numericAmount < MIN_WITHDRAWAL;
  const exceedsBalance = numericAmount > 0 && estimatedBalance !== null && numericAmount > estimatedBalance;
  const canSubmit =
    !!numericAmount && numericAmount >= MIN_WITHDRAWAL && !exceedsBalance && !hasUnpaidRequest && !!bankAccount?.verified;
  const breakdown = numericAmount >= MIN_WITHDRAWAL ? estimateBreakdown(numericAmount) : null;

  async function handleRequest() {
    if (!canSubmit) return;
    setSubmitting(true);
    const ok = await requestPayout(numericAmount);
    setSubmitting(false);
    if (ok) setAmount('');
  }

  async function handleSaveBank() {
    const bank = NIGERIAN_BANKS.find((b) => b.code === bankCode);
    if (!bank || accountNumber.length < 10) return;
    setSavingBank(true);
    const ok = await saveBankAccount({ account_number: accountNumber, bank_code: bank.code, bank_name: bank.name });
    setSavingBank(false);
    if (ok) {
      setEditingBank(false);
      setAccountNumber('');
      setBankCode('');
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
        <p className="text-[11.5px] mb-1" style={{ color: 'var(--gray)' }}>Estimated available balance</p>
        <p className="text-[22px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          ₦{estimatedBalance?.toLocaleString() ?? 0}
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
        ) : (
          <div className="space-y-2 mt-1.5">
            <p className="text-[11px]" style={{ color: 'var(--gray)' }}>
              The account name must match your own profile name to be accepted.
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
      </div>

      {/* Withdraw */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder={`Amount (min ₦${MIN_WITHDRAWAL.toLocaleString()})`}
            inputMode="numeric"
            disabled={hasUnpaidRequest}
            className="flex-1 px-3 py-2.5 rounded-[9px] text-[13px] outline-none disabled:opacity-50"
            style={{ border: '1px solid var(--line)' }}
          />
          <button
            onClick={handleRequest}
            disabled={!canSubmit || submitting}
            className="px-4 rounded-[9px] text-[12.5px] font-semibold text-white disabled:opacity-40 flex items-center gap-1.5"
            style={{ background: 'var(--orange)' }}
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Withdraw
          </button>
        </div>

        {breakdown && (
          <div className="mt-2 p-2.5 rounded-[9px] space-y-1" style={{ background: 'var(--peach)' }}>
            <div className="flex justify-between text-[11.5px]">
              <span style={{ color: 'var(--gray)' }}>Requested</span>
              <span style={{ color: 'var(--ink)' }}>₦{numericAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11.5px]">
              <span style={{ color: 'var(--gray)' }}>Fee (5%)</span>
              <span style={{ color: 'var(--red)' }}>−₦{breakdown.fee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[12px] font-semibold pt-1" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ color: 'var(--ink)' }}>You'll receive</span>
              <span style={{ color: 'var(--ink)' }}>₦{breakdown.net.toLocaleString()}</span>
            </div>
          </div>
        )}

        {belowMinimum && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--red)' }}>
            Minimum withdrawal is ₦{MIN_WITHDRAWAL.toLocaleString()}.
          </p>
        )}
        {exceedsBalance && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--red)' }}>
            That's more than your available balance.
          </p>
        )}
        {!bankAccount?.verified && numericAmount > 0 && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--red)' }}>
            Add a verified withdrawal account above first.
          </p>
        )}
        {hasUnpaidRequest && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--gray)' }}>
            You have a withdrawal request awaiting payment.
          </p>
        )}
        {error && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--red)' }}>
            {error}
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
