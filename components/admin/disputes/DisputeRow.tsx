'use client';

import { useState } from 'react';
import useDisputeAction from '@/hooks/useDisputeAction';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  open: { bg: '#FFF1E6', fg: '#E85D00' },
  investigating: { bg: '#FFF1E6', fg: '#E85D00' },
  resolved: { bg: '#E4F5EB', fg: '#1E9E5A' },
  dismissed: { bg: '#F0E1D2', fg: '#8C8681' },
};

export default function DisputeRow({ dispute }: any) {
  const { resolveDispute, loadingIds } = useDisputeAction();
  const [notes, setNotes] = useState('');
  const isLoading = loadingIds.includes(dispute.id);
  const color = STATUS_COLORS[dispute.status] ?? STATUS_COLORS.open;
  const isOpen = dispute.status === 'open' || dispute.status === 'investigating';

  async function handle(status: 'resolved' | 'dismissed') {
    try {
      await resolveDispute(dispute.id, status, notes);
    } catch (err: any) {
      alert(err?.message || 'Failed to update dispute');
    }
  }

  return (
    <div className="py-3" style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: color.bg, color: color.fg }}>
          {dispute.status}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--gray)' }}>{new Date(dispute.created_at).toLocaleString()}</span>
      </div>
      <div className="text-[13px] mb-1">{dispute.reason}</div>
      <div className="text-[11px] mb-2" style={{ color: 'var(--gray)' }}>Raised by {dispute.raised_by} · Order {dispute.order_id?.slice(0, 8)}</div>

      {isOpen && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Resolution note…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-1 rounded-md px-2.5 py-1.5 text-[12.5px]"
            style={{ border: '1px solid var(--line)' }}
          />
          <div className="flex gap-2">
            <button onClick={() => handle('dismissed')} disabled={isLoading} className="px-3 py-1.5 rounded-md text-[12.5px]" style={{ border: '1px solid var(--line)', opacity: isLoading ? 0.6 : 1 }}>
              Dismiss
            </button>
            <button onClick={() => handle('resolved')} disabled={isLoading} className="px-3 py-1.5 rounded-md text-[12.5px] text-white" style={{ background: 'var(--orange)', opacity: isLoading ? 0.6 : 1 }}>
              {isLoading ? 'Saving…' : 'Resolve'}
            </button>
          </div>
        </div>
      )}

      {dispute.resolution_notes && !isOpen && (
        <div className="text-[11.5px] mt-1" style={{ color: 'var(--gray)' }}>Note: {dispute.resolution_notes}</div>
      )}
    </div>
  );
}
