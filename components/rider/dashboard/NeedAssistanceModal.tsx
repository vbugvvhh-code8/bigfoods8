'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';

const REASONS = [
  { value: 'accident', label: 'Accident' },
  { value: 'breakdown', label: 'Vehicle breakdown' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'fuel', label: 'Out of fuel' },
  { value: 'other', label: 'Other' },
];

interface NeedAssistanceModalProps {
  orderId: string;
  orderStatus: string; // 'placed' | 'preparing' | 'picked_up'
  onClose: () => void;
  onDone: () => void; // called after a successful cancel/transfer-request, so the parent can refresh/navigate away
}

/**
 * Drop this into the active-delivery page (delivery/[orderId]/page.tsx) behind
 * a "Need assistance" button, e.g.:
 *   const [showAssist, setShowAssist] = useState(false);
 *   ...
 *   <button onClick={() => setShowAssist(true)}>Need assistance</button>
 *   {showAssist && (
 *     <NeedAssistanceModal
 *       orderId={order.id}
 *       orderStatus={order.status}
 *       onClose={() => setShowAssist(false)}
 *       onDone={() => router.push('/rider-portal/dashboard')}
 *     />
 *   )}
 */
export default function NeedAssistanceModal({ orderId, orderStatus, onClose, onDone }: NeedAssistanceModalProps) {
  const supabase = getBrowserSupabase();
  const alreadyPickedUp = orderStatus === 'picked_up';

  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [rewardPct, setRewardPct] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    try {
      if (alreadyPickedUp) {
        // Food's already with this rider -- opens a hand-off request for
        // another rider to come collect it. Order stays alive, no penalty
        // applied here (admin reviews the reason/note and decides).
        const { data, error: fnError } = await supabase.functions.invoke('rider-request-transfer', {
          body: { order_id: orderId, reward_pct: rewardPct, cancellation_reason: reason, cancellation_note: note || undefined },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
      } else {
        // Food's still at the restaurant -- straight reassignment, strike only.
        const { data, error: fnError } = await supabase.functions.invoke('rider-cancel-delivery', {
          body: { order_id: orderId },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
      }
      onDone();
    } catch (e: any) {
      setError(e?.message ?? 'Could not process this — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full sm:max-w-[420px] max-h-[90vh] overflow-auto rounded-t-2xl sm:rounded-2xl p-5" style={{ background: 'var(--white)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Need assistance
          </h2>
          <button onClick={onClose} aria-label="Close" style={{ color: 'var(--gray)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[12px] mb-4" style={{ color: 'var(--gray)' }}>
          {alreadyPickedUp
            ? "You already picked up this order, so we'll open a hand-off request for a nearby rider to come collect it from you."
            : "You haven't picked up this order yet, so it'll just be reassigned to the next available rider."}
        </p>

        <div className="mb-3.5">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none bg-white"
            style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
          >
            <option value="" disabled>Select a reason</option>
            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div className="mb-3.5">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Note <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Anything admin should know"
            className="w-full px-3 py-2.5 rounded-[9px] text-[13px] outline-none resize-none"
            style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--white)' }}
          />
        </div>

        {alreadyPickedUp && (
          <div className="mb-4">
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
              Reward for the rider who finishes it: {rewardPct}%
            </label>
            <input
              type="range"
              min={0}
              max={80}
              step={5}
              value={rewardPct}
              onChange={(e) => setRewardPct(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--gray)' }}>
              This % of your earning on this delivery goes to whoever collects it from you.
            </p>
          </div>
        )}

        {error && (
          <p className="text-[11.5px] mb-3 p-3 rounded-[9px]" style={{ background: '#FEF2F2', color: 'var(--red)' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!reason || submitting}
          className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'var(--orange)' }}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {alreadyPickedUp ? 'Request hand-off' : 'Cancel this delivery'}
        </button>
      </div>
    </div>
  );
}
