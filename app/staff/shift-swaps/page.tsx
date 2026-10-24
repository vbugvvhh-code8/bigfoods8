'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, CheckCircle2, CircleAlert, RefreshCw, Repeat2 } from 'lucide-react';
import StaffShell from '@/components/staff/StaffShell';

type Shift = { id: string; shift_date: string; starts_at: string; ends_at: string; status: string; bigfoods_staff_shift_templates?: { name: string } };
type SwapRequest = { id: string; requested_shift_assignment_id: string; target_staff_id: string | null; reason: string; status: string; review_note: string | null; created_at: string; bigfoods_staff_shift_assignments?: { shift_date: string; starts_at: string; ends_at: string; status: string; bigfoods_staff_shift_templates?: { name: string } }; target?: { display_name: string; employee_code: string | null } | null };

const field = 'mt-2 block w-full rounded-lg border border-[#DED6CE] bg-white px-3 py-3 text-sm text-[#28231F] outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100';
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FF6A00] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50';
const dateTime = (value: string) => new Date(value).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function StaffShiftSwapsPage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [shiftId, setShiftId] = useState('');
  const [targetStaffId, setTargetStaffId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const call = useCallback(async (body: Record<string, unknown>) => {
    const response = await fetch('/api/bigfoods-staff/operations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      const [schedule, swapData] = await Promise.all([call({ action: 'my_schedule' }), call({ action: 'shift_swap_list' })]);
      const eligible = (schedule.shifts || []).filter((shift: Shift) => shift.status === 'scheduled' && new Date(shift.starts_at) > new Date());
      setShifts(eligible);
      setRequests(swapData.requests || []);
      setShiftId(current => eligible.some((shift: Shift) => shift.id === current) ? current : eligible[0]?.id || '');
    } catch (e) {
      if (e instanceof Error && /unauthenticated/i.test(e.message)) router.replace('/staff/login');
      else setError(e instanceof Error ? e.message : 'Unable to load shift swaps');
    } finally { setLoading(false); }
  }, [call, router]);

  useEffect(() => { void load(); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await call({ action: 'shift_swap_request', shift_assignment_id: shiftId, target_staff_id: targetStaffId.trim() || null, reason });
      setNotice('Shift-swap request submitted for admin review.');
      setTargetStaffId(''); setReason('');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to submit shift-swap request'); }
    finally { setBusy(false); }
  }

  return <StaffShell title="Shift swaps" subtitle="Request a change to an upcoming shift and track the admin decision.">
    {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p></div>}
    {notice && <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-[12px] text-green-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><p>{notice}</p></div>}
    <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[.9fr_1.1fr]">
      <div className="rounded-xl border bg-white p-4 sm:p-5" style={{ borderColor: 'var(--line, #E8E0D8)' }}>
        <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#FFF0E5] text-orange-700"><ArrowLeftRight className="h-5 w-5" /></div><div><h2 className="text-[13px] font-semibold">New shift-swap request</h2><p className="mt-1 text-[11px] text-[#81766D]">Select an upcoming shift. Admin can assign an eligible colleague if you do not have a target in mind.</p></div></div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-[11px] font-semibold text-[#51473F]">Shift to change<select required className={field} value={shiftId} onChange={e => setShiftId(e.target.value)}><option value="">Choose a scheduled shift</option>{shifts.map(shift => <option key={shift.id} value={shift.id}>{shift.shift_date} · {shift.bigfoods_staff_shift_templates?.name || 'Shift'} ({new Date(shift.starts_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}–{new Date(shift.ends_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})})</option>)}</select></label>
          <label className="block text-[11px] font-semibold text-[#51473F]">Colleague staff ID (optional)<input className={field} value={targetStaffId} onChange={e => setTargetStaffId(e.target.value)} placeholder="Leave blank for admin assignment" /><span className="mt-1 block font-normal text-[#81766D]">For a direct swap, your colleague must have a matching scheduled shift.</span></label>
          <label className="block text-[11px] font-semibold text-[#51473F]">Reason<textarea required maxLength={1000} rows={4} className={field} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why you need to change this shift" /></label>
          <button disabled={busy || loading || !shiftId || !reason.trim()} className={button}>{busy ? <><RefreshCw className="h-4 w-4 animate-spin" />Submitting…</> : 'Submit shift-swap request'}</button>
          {!shifts.length && !loading && <p className="text-[11px] text-[#81766D]">You have no future scheduled shifts eligible for a request.</p>}
        </form>
      </div>
      <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: 'var(--line, #E8E0D8)' }}>
        <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5" style={{ borderColor: 'var(--line, #E8E0D8)' }}><div><h2 className="text-[13px] font-semibold">My requests</h2><p className="mt-1 text-[11px] text-[#81766D]">Request status and admin notes.</p></div><button aria-label="Refresh shift-swap requests" onClick={() => void load()} disabled={loading || busy} className="rounded-lg border p-2 disabled:opacity-50" style={{ borderColor: 'var(--line, #E8E0D8)' }}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button></div>
        {loading ? <div className="space-y-3 p-4"><div className="h-20 animate-pulse rounded-lg bg-[#F2EEE9]" /><div className="h-20 animate-pulse rounded-lg bg-[#F2EEE9]" /></div> : requests.length ? <div className="space-y-3 p-4">{requests.map(request => <article key={request.id} className="rounded-lg border p-3 sm:p-4" style={{ borderColor: 'var(--line, #E8E0D8)' }}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[12px] font-semibold">{request.bigfoods_staff_shift_assignments?.bigfoods_staff_shift_templates?.name || 'Scheduled shift'}</p><p className="mt-1 text-[11px] text-[#655A52]">{request.bigfoods_staff_shift_assignments?.starts_at ? dateTime(request.bigfoods_staff_shift_assignments.starts_at) : 'Shift details unavailable'}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${request.status === 'approved' ? 'bg-green-50 text-green-800' : request.status === 'rejected' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>{request.status.replaceAll('_', ' ')}</span></div><p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-[#81766D]">{request.reason}</p>{request.target?.display_name && <p className="mt-2 text-[10.5px] text-[#655A52]">Target colleague: {request.target.display_name}</p>}{request.review_note && <div className="mt-3 rounded-md bg-[#F7F4F0] p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#655A52]">Admin note</p><p className="mt-1 text-[11px] text-[#655A52]">{request.review_note}</p></div>}</article>)}</div> : <div className="px-4 py-12 text-center"><Repeat2 className="mx-auto h-7 w-7 text-[#B8ADA3]" /><p className="mt-3 text-[12px] font-semibold">No shift-swap requests yet</p><p className="mt-1 text-[11px] text-[#81766D]">Requests and their decisions will appear here.</p></div>}
      </div>
    </section>
  </StaffShell>;
}
