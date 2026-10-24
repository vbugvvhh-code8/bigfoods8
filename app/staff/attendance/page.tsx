'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Clock3, MapPin, RefreshCw, CheckCircle2, CircleAlert, Navigation, QrCode, ArrowRight, CalendarCheck2, ScanLine, X } from 'lucide-react';
import StaffShell from '@/components/staff/StaffShell';
import { Html5Qrcode } from 'html5-qrcode';

type Shift = {
  id: string; shift_date: string; starts_at: string; ends_at: string; status: string; work_location_id: string | null;
  bigfoods_staff_shift_templates?: { name: string; start_time: string; end_time: string };
  bigfoods_staff_work_locations?: { name: string; address: string | null; radius_m: number };
};
type Attendance = {
  id: string; shift_assignment_id: string | null; checked_in_at: string; checked_out_at: string | null; status: string;
  check_in_distance_m: number | null; check_out_distance_m: number | null; check_in_qr_verified: boolean; check_out_qr_verified: boolean;
};

const dateTime = (value: string) => new Date(value).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const time = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const date = (value: string) => new Date(value).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function StaffAttendancePage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [open, setOpen] = useState<Attendance | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [shiftId, setShiftId] = useState('');
  const [qr, setQr] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
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
      const [schedule, attendance] = await Promise.all([call({ action: 'my_schedule' }), call({ action: 'attendance_status' })]);
      const nextShifts: Shift[] = schedule.shifts || [];
      setShifts(nextShifts);
      setOpen(attendance.open_attendance || null);
      setHistory(attendance.history || []);
      setShiftId((current) => {
        if (current && nextShifts.some((shift) => shift.id === current && shift.status === 'scheduled')) return current;
        return nextShifts.find((shift) => shift.status === 'scheduled')?.id || '';
      });
    } catch (e) {
      if (e instanceof Error && /unauthenticated/i.test(e.message)) router.replace('/staff/login');
      else setError(e instanceof Error ? e.message : 'Unable to load attendance');
    } finally {
      setLoading(false);
    }
  }, [call, router]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!scannerOpen) return;
    let active = true;
    let scanner: Html5Qrcode | null = null;
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access is unavailable. Open this page over HTTPS in Safari and allow camera access.');
        }
        scanner = new Html5Qrcode('staff-attendance-qr-reader', { verbose: false });
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: (width, height) => ({ width: Math.floor(Math.min(width, height) * 0.75), height: Math.floor(Math.min(width, height) * 0.75) }), aspectRatio: 1 },
          (decodedText) => {
            if (!active || !decodedText.trim()) return;
            setQr(decodedText.trim());
            setScannerError('');
            setScannerOpen(false);
          },
          () => { /* Ignore frames that do not contain a readable QR code. */ },
        );
        if (!active && scanner.isScanning) await scanner.stop();
      } catch (e) {
        setScannerError(e instanceof Error ? e.message : 'Unable to start camera. Allow camera access in Safari settings and try again.');
      }
    };
    void start();
    return () => {
      active = false;
      if (scanner?.isScanning) void scanner.stop().catch(() => {});
      else if (scanner) void scanner.clear().catch(() => {});
    };
  }, [scannerOpen]);

  // Best-effort monitoring while the staff attendance page remains open.
  // The server enforces a 30-minute minimum interval and rejects extra pings.
  useEffect(() => {
    if (!open || !navigator.geolocation) return;
    let active = true;
    const sendPing = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.geolocation.getCurrentPosition(async (position) => {
        if (!active) return;
        try {
          await call({ action: 'location_ping', latitude: position.coords.latitude, longitude: position.coords.longitude });
        } catch {
          // Monitoring failures should not prevent a staff member from using attendance.
        }
      }, () => {}, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    };
    sendPing();
    const interval = window.setInterval(sendPing, 30 * 60 * 1000);
    return () => { active = false; window.clearInterval(interval); };
  }, [open?.id, call]);


  async function punch(action: 'check_in' | 'check_out') {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!navigator.geolocation) throw new Error('This browser does not support GPS location.');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      });
      await call({
        action,
        shift_assignment_id: open?.shift_assignment_id || shiftId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        qr_token: qr.trim(),
      });
      setNotice(action === 'check_in' ? 'Check-in recorded successfully.' : 'Check-out recorded successfully.');
      setQr('');
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to record attendance';
      setError(message === 'User denied Geolocation' || message.toLowerCase().includes('permission denied')
        ? 'Location permission is required. Allow location access in your browser settings and try again.'
        : message);
    } finally { setBusy(false); }
  }

  const selectedShift = shifts.find((shift) => shift.id === shiftId);
  const upcoming = shifts.filter((shift) => shift.status === 'scheduled' || shift.id === open?.shift_assignment_id);
  const field = 'mt-2 block w-full rounded-lg border border-[#DED6CE] bg-white px-3 py-3 text-sm text-[#28231F] outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100';
  const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FF6A00] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50';

  return <StaffShell title="Attendance & schedule" subtitle="Check your shift, record attendance and review your recent work history.">
    {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p></div>}
    {notice && <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-[12px] text-green-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><p>{notice}</p></div>}

    <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border bg-white p-4" style={{ borderColor: 'var(--line, #E8E0D8)' }}><div className="flex items-center gap-2 text-[#81766D]"><CalendarDays className="h-4 w-4" /><span className="text-[11px]">Upcoming shifts</span></div><p className="mt-2 text-2xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{loading ? '—' : upcoming.length}</p><p className="mt-1 text-[10.5px] text-[#81766D]">In your schedule</p></div>
      <div className="rounded-xl border bg-white p-4" style={{ borderColor: 'var(--line, #E8E0D8)' }}><div className="flex items-center gap-2 text-[#81766D]"><Clock3 className="h-4 w-4" /><span className="text-[11px]">Attendance status</span></div><p className="mt-2 text-2xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{loading ? '—' : open ? 'On shift' : 'Off shift'}</p><p className="mt-1 text-[10.5px] text-[#81766D]">{open ? `Checked in ${time(open.checked_in_at)}` : 'No active check-in'}</p></div>
      <div className="rounded-xl border bg-white p-4" style={{ borderColor: 'var(--line, #E8E0D8)' }}><div className="flex items-center gap-2 text-[#81766D]"><CheckCircle2 className="h-4 w-4" /><span className="text-[11px]">Recent records</span></div><p className="mt-2 text-2xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{loading ? '—' : history.length}</p><p className="mt-1 text-[10.5px] text-[#81766D]">Attendance history loaded</p></div>
    </section>

    <section className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-[1.1fr_.9fr]">
      <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: 'var(--line, #E8E0D8)' }}>
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5" style={{ borderColor: 'var(--line, #E8E0D8)' }}><div><h2 className="text-[13px] font-semibold">Clock in / out</h2><p className="mt-1 text-[11px] text-[#81766D]">GPS and a current premises code are required.</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${open ? 'bg-green-50 text-green-800' : 'bg-[#F7F4F0] text-[#74685F]'}`}>{open ? 'On shift' : 'Off shift'}</span></div>
        <div className="space-y-4 p-4 sm:p-5">
          {loading ? <div className="space-y-3"><div className="h-10 animate-pulse rounded-lg bg-[#F2EEE9]" /><div className="h-12 animate-pulse rounded-lg bg-[#F2EEE9]" /><div className="h-11 animate-pulse rounded-lg bg-[#F2EEE9]" /></div> : <>
            {open ? <div className="rounded-lg border border-green-100 bg-green-50 p-3"><p className="text-[12px] font-semibold text-green-900">Your shift is in progress</p><p className="mt-1 text-[11px] text-green-800">Checked in {dateTime(open.checked_in_at)}</p><p className="mt-1 text-[10.5px] text-green-800">GPS distance at check-in: {open.check_in_distance_m ?? '—'} m</p></div> : <div><label className="text-[11px] font-semibold text-[#51473F]" htmlFor="scheduled-shift">Select your assigned shift</label><select id="scheduled-shift" className={field} value={shiftId} onChange={(e) => setShiftId(e.target.value)}><option value="">Choose a scheduled shift</option>{shifts.filter((shift) => shift.status === 'scheduled').map((shift) => <option key={shift.id} value={shift.id}>{date(shift.starts_at)} · {shift.bigfoods_staff_shift_templates?.name || 'Shift'} ({time(shift.starts_at)}–{time(shift.ends_at)})</option>)}</select>{selectedShift && <div className="mt-2 flex items-start gap-2 text-[10.5px] text-[#81766D]"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{selectedShift.bigfoods_staff_work_locations?.name || 'Work location assigned'} · permitted radius {selectedShift.bigfoods_staff_work_locations?.radius_m ?? '—'} m</span></div>}</div>}
            <div><label className="flex items-center gap-2 text-[11px] font-semibold text-[#51473F]" htmlFor="premises-token"><QrCode className="h-4 w-4 text-orange-600" />Premises QR code token</label><input id="premises-token" className={field} value={qr} onChange={(e) => setQr(e.target.value)} placeholder="Enter the current code displayed at work" autoComplete="off" autoCapitalize="none" spellCheck={false} /><div className="mt-2 flex flex-wrap items-center gap-2"><button type="button" onClick={() => { setScannerError(""); setScannerOpen(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800"><ScanLine className="h-4 w-4" />Scan premises QR</button><span className="text-xs text-gray-500">Scan with your phone camera to fill this field.</span></div>{scannerError && <p role="alert" className="mt-2 text-xs text-red-700">{scannerError}</p>}{scannerOpen && <div className="mt-3 rounded-xl border border-orange-200 bg-black p-3"><div className="mb-2 flex items-center justify-between text-sm font-semibold text-white"><span>Scan premises QR</span><button type="button" onClick={() => setScannerOpen(false)} className="rounded-md p-1" aria-label="Close scanner"><X className="h-4 w-4" /></button></div><div id="staff-attendance-qr-reader" className="w-full overflow-hidden rounded-lg bg-black" /><p className="mt-2 text-xs text-gray-200">Point the rear camera at the live code on the premises display. If Safari asks, tap Allow to grant camera access.</p></div>}<p className="mt-2 text-[10.5px] leading-5 text-[#81766D]">The code expires after 45 seconds and can only be used once. Allow GPS access when prompted.</p></div>
            <button disabled={busy || !qr.trim() || (!open && !shiftId)} onClick={() => void punch(open ? 'check_out' : 'check_in')} className={`${button} w-full`}>{busy ? <><RefreshCw className="h-4 w-4 animate-spin" />{open ? 'Checking out…' : 'Checking in…'}</> : <><Navigation className="h-4 w-4" />{open ? 'Check out of shift' : 'Check in to shift'}</>}</button>
          </>}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: 'var(--line, #E8E0D8)' }}>
        <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5" style={{ borderColor: 'var(--line, #E8E0D8)' }}><div><h2 className="text-[13px] font-semibold">Upcoming shifts</h2><p className="mt-1 text-[11px] text-[#81766D]">Your assigned work schedule</p></div><CalendarCheck2 className="h-4 w-4 text-[#81766D]" /></div>
        <div className="divide-y" style={{ borderColor: 'var(--line, #E8E0D8)' }}>
          {loading ? <div className="space-y-3 p-4"><div className="h-14 animate-pulse rounded-lg bg-[#F2EEE9]" /><div className="h-14 animate-pulse rounded-lg bg-[#F2EEE9]" /></div> : upcoming.length ? upcoming.map((shift) => <div key={shift.id} className="flex items-start gap-3 p-4"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FFF0E5] text-orange-700"><CalendarDays className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[12px] font-semibold">{shift.bigfoods_staff_shift_templates?.name || 'Scheduled shift'}</p><span className={`rounded-full px-2 py-0.5 text-[9.5px] font-medium ${shift.id === open?.shift_assignment_id ? 'bg-green-50 text-green-800' : 'bg-[#F7F4F0] text-[#74685F]'}`}>{shift.id === open?.shift_assignment_id ? 'In progress' : shift.status.replaceAll('_', ' ')}</span></div><p className="mt-1 text-[10.5px] text-[#655A52]">{date(shift.starts_at)} · {time(shift.starts_at)}–{time(shift.ends_at)}</p><p className="mt-1 flex items-center gap-1 text-[10.5px] text-[#81766D]"><MapPin className="h-3 w-3" />{shift.bigfoods_staff_work_locations?.name || 'Location not set'}</p></div></div>) : <div className="px-4 py-8 text-center"><CalendarDays className="mx-auto h-6 w-6 text-[#B8ADA3]" /><p className="mt-2 text-[12px] font-medium">No upcoming shifts</p><p className="mt-1 text-[10.5px] text-[#81766D]">Your assigned shifts will appear here.</p></div>}
        </div>
      </div>
    </section>

    <section className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: 'var(--line, #E8E0D8)' }}>
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: 'var(--line, #E8E0D8)' }}><div><h2 className="text-[13px] font-semibold">Attendance history</h2><p className="mt-1 text-[11px] text-[#81766D]">Your recent check-in and check-out records</p></div><button onClick={() => void load()} disabled={loading || busy} className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-lg border px-3 py-2 text-[11px] font-medium disabled:opacity-50 sm:self-auto" style={{ borderColor: 'var(--line, #E8E0D8)' }}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh records</button></div>
      {loading ? <div className="space-y-3 p-4"><div className="h-12 animate-pulse rounded-lg bg-[#F2EEE9]" /><div className="h-12 animate-pulse rounded-lg bg-[#F2EEE9]" /></div> : history.length ? <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[650px] text-left text-[11.5px]"><thead style={{ background: '#FCFAF7', color: '#81766D' }}><tr>{['Date', 'Check-in', 'Check-out', 'GPS distance', 'QR verification', 'Status'].map((label) => <th key={label} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide">{label}</th>)}</tr></thead><tbody>{history.map((item) => <tr key={item.id} className="border-t" style={{ borderColor: 'var(--line, #E8E0D8)' }}><td className="px-4 py-3">{date(item.checked_in_at)}</td><td className="px-4 py-3">{time(item.checked_in_at)}</td><td className="px-4 py-3">{item.checked_out_at ? time(item.checked_out_at) : '—'}</td><td className="px-4 py-3">{item.check_in_distance_m ?? '—'} m</td><td className="px-4 py-3">{item.check_in_qr_verified ? 'Check-in verified' : '—'}{item.checked_out_at ? (item.check_out_qr_verified ? ' · out verified' : ' · out not verified') : ''}</td><td className="px-4 py-3"><span className="rounded-full bg-[#F7F4F0] px-2 py-1 text-[10px] capitalize">{item.status.replaceAll('_', ' ')}</span></td></tr>)}</tbody></table></div>
        <div className="divide-y md:hidden" style={{ borderColor: 'var(--line, #E8E0D8)' }}>{history.map((item) => <article key={item.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[12px] font-semibold">{date(item.checked_in_at)}</p><p className="mt-1 text-[10.5px] text-[#81766D]">Check-in {time(item.checked_in_at)} · Check-out {item.checked_out_at ? time(item.checked_out_at) : 'Not checked out'}</p></div><span className="rounded-full bg-[#F7F4F0] px-2 py-1 text-[9.5px] capitalize">{item.status.replaceAll('_', ' ')}</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-[#655A52]"><span className="inline-flex items-center gap-1"><Navigation className="h-3 w-3" />{item.check_in_distance_m ?? '—'} m GPS</span><span className="inline-flex items-center gap-1"><QrCode className="h-3 w-3" />{item.check_in_qr_verified ? 'QR verified' : 'QR not recorded'}</span></div></article>)}</div>
      </> : <div className="px-4 py-10 text-center"><Clock3 className="mx-auto h-6 w-6 text-[#B8ADA3]" /><p className="mt-2 text-[12px] font-medium">No attendance records yet</p><p className="mt-1 text-[10.5px] text-[#81766D]">Completed attendance records will appear here.</p><button onClick={() => router.push('/staff')} className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold text-orange-700">Back to dashboard <ArrowRight className="h-3.5 w-3.5" /></button></div>}
    </section>
  </StaffShell>;
}
