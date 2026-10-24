'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, CheckCircle2, CircleAlert, Clock3, RefreshCw } from 'lucide-react';
import StaffShell from '@/components/staff/StaffShell';

type LeaveRequest = { id: string; leave_type: string; starts_on: string; ends_on: string; reason: string; status: string; review_note: string | null; created_at: string };

const field = 'mt-2 block w-full rounded-lg border border-[#DED6CE] bg-white px-3 py-3 text-sm text-[#28231F] outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100';
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FF6A00] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50';

export default function StaffLeavePage() {
  const router = useRouter();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveType, setLeaveType] = useState('annual');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const call = useCallback(async (body: Record<string, unknown>) => {
    const response = await fetch('/api/bigfoods-staff/operations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await call({ action: 'leave_list' });
      setRequests(data.requests || []);
    } catch (e) {
      if (e instanceof Error && /unauthenticated/i.test(e.message)) router.replace('/staff/login');
      else setError(e instanceof Error ? e.message : 'Unable to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [call, router]);

  useEffect(() => { void load(); }, [load]);

  async function submitLeave(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      await call({ action: 'leave_request', leave_type: leaveType, starts_on: startsOn, ends_on: endsOn, reason });
      setNotice('Leave request submitted for admin review.');
      setStartsOn(''); setEndsOn(''); setReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to submit leave request');
    } finally {
      setBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return <StaffShell title="Request leave" subtitle="Submit time off for approval and track the status of your requests.">
    {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p></div>}
    {notice && <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-[12px] text-green-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><p>{notice}</p></div>}

    <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[.9fr_1.1fr]">
      <div className="rounded-xl border bg-white p-4 sm:p-5" style={{ borderColor: 'var(--line, #E8E0D8)' }}>
        <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#FFF0E5] text-orange-700"><CalendarPlus className="h-5 w-5" /></div><div><h2 className="text-[13px] font-semibold">New leave request</h2><p className="mt-1 text-[11px] text-[#81766D]">Choose your leave dates and provide a short reason for your manager.</p></div></div>
        <form onSubmit={submitLeave} className="mt-5 space-y-4">
          <label className="block text-[11px] font-semibold text-[#51473F]">Leave type<select className={field} value={leaveType} onChange={e => setLeaveType(e.target.value)}><option value="annual">Annual leave</option><option value="sick">Sick leave</option><option value="personal">Personal leave</option><option value="unpaid">Unpaid leave</option><option value="other">Other</option></select></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-[11px] font-semibold text-[#51473F]">From<input required type="date" min={today} className={field} value={startsOn} onChange={e => { setStartsOn(e.target.value); if (endsOn && endsOn < e.target.value) setEndsOn(''); }} /></label>
            <label className="block text-[11px] font-semibold text-[#51473F]">To<input required type="date" min={startsOn || today} className={field} value={endsOn} onChange={e => setEndsOn(e.target.value)} /></label>
          </div>
          <label className="block text-[11px] font-semibold text-[#51473F]">Reason<textarea required maxLength={1000} rows={4} className={field} value={reason} onChange={e => setReason(e.target.value)} placeholder="Briefly explain your request" /></label>
          <button disabled={busy || !startsOn || !endsOn || endsOn < startsOn || !reason.trim()} className={button}>{busy ? <><RefreshCw className="h-4 w-4 animate-spin" />Submitting…</> : 'Submit leave request'}</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: 'var(--line, #E8E0D8)' }}>
        <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5" style={{ borderColor: 'var(--line, #E8E0D8)' }}><div><h2 className="text-[13px] font-semibold">My leave requests</h2><p className="mt-1 text-[11px] text-[#81766D]">Review decisions and any notes from the admin team.</p></div><button aria-label="Refresh leave requests" onClick={() => void load()} disabled={loading || busy} className="rounded-lg border p-2 disabled:opacity-50" style={{ borderColor: 'var(--line, #E8E0D8)' }}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button></div>
        {loading ? <div className="space-y-3 p-4"><div className="h-20 animate-pulse rounded-lg bg-[#F2EEE9]" /><div className="h-20 animate-pulse rounded-lg bg-[#F2EEE9]" /></div> : requests.length ? <div className="space-y-3 p-4">{requests.map(request => <article key={request.id} className="rounded-lg border p-3 sm:p-4" style={{ borderColor: 'var(--line, #E8E0D8)' }}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[12px] font-semibold capitalize">{request.leave_type} leave</p><p className="mt-1 text-[11px] text-[#655A52]">{request.starts_on} to {request.ends_on}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${request.status === 'approved' ? 'bg-green-50 text-green-800' : request.status === 'rejected' ? 'bg-red-50 text-red-800' : request.status === 'pending' ? 'bg-amber-50 text-amber-800' : 'bg-[#F7F4F0] text-[#655A52]'}`}>{request.status.replaceAll('_', ' ')}</span></div><p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-[#81766D]">{request.reason}</p>{request.review_note && <div className="mt-3 rounded-md bg-[#F7F4F0] p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#655A52]">Admin note</p><p className="mt-1 text-[11px] text-[#655A52]">{request.review_note}</p></div>}</article>)}</div> : <div className="px-4 py-12 text-center"><Clock3 className="mx-auto h-7 w-7 text-[#B8ADA3]" /><p className="mt-3 text-[12px] font-semibold">No leave requests yet</p><p className="mt-1 text-[11px] text-[#81766D]">Once you submit a request, its approval status will appear here.</p></div>}
      </div>
    </section>
  </StaffShell>;
}
