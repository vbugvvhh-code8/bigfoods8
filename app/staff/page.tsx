'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Clock3, ShieldCheck, ArrowUpRight, UserRound, CheckCircle2 } from 'lucide-react';
import StaffShell from '@/components/staff/StaffShell';

type Staff = { id: string; email: string; display_name: string; role: string; permissions: unknown; must_change_password: boolean };
export const dynamic = 'force-dynamic';

export default function StaffHomePage() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    fetch('/api/bigfoods-staff/session', { cache: 'no-store' })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error('Session expired'); return d.staff as Staff; })
      .then((s) => { if (live) setStaff(s); })
      .catch(() => { if (live) { setError('Your session could not be verified. Redirecting to sign in…'); router.replace('/staff/login'); } });
    return () => { live = false; };
  }, [router]);

  if (!staff) return <main className="grid min-h-screen place-items-center bg-[#F7F4F0]"><p className="text-sm text-[#81766D]">{error || 'Verifying staff session…'}</p></main>;

  const cards = [
    { title: 'Attendance & schedule', description: 'View your assigned shifts, check in or out, and review your attendance history.', action: 'Open attendance', icon: <CalendarCheck className="h-4 w-4" />, onClick: () => router.push('/staff/attendance'), featured: true },
    { title: 'Shift information', description: 'Keep your upcoming work times and assigned premises easy to find.', action: 'View my shifts', icon: <Clock3 className="h-4 w-4" />, onClick: () => router.push('/staff/attendance'), featured: false },
    { title: 'Account & access', description: 'Your role determines which employee tools are available in this workspace.', action: staff.role.replace(/_/g, ' '), icon: <ShieldCheck className="h-4 w-4" />, onClick: undefined, featured: false },
  ];

  return <StaffShell title="Dashboard" staffName={staff.display_name} subtitle="Your personal staff workspace and daily tools.">
    {staff.must_change_password && <div className="mb-4 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: '#E8C77B', background: '#FFF8E7', color: '#7A4B12' }}><div><p className="text-[12.5px] font-semibold">Password update required</p><p className="mt-1 text-[11.5px]">Change your temporary password before continuing to use staff tools.</p></div><button onClick={() => router.push('/staff/change-password')} className="rounded-lg px-3 py-2 text-[11.5px] font-semibold text-white" style={{ background: '#8A4B10' }}>Change password</button></div>}

    <section className="mb-4 flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: 'var(--line, #E8E0D8)' }}>
      <div><p className="text-[11px] font-medium text-[#81766D]">STAFF WORKSPACE</p><h2 className="mt-1 text-[18px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Welcome back, {staff.display_name.split(' ')[0]}</h2><p className="mt-1 text-[11.5px] text-[#81766D]">{staff.email}</p></div>
      <div className="flex items-center gap-2 self-start rounded-lg px-3 py-2 sm:self-center" style={{ background: '#F0FAF2', color: '#23643B' }}><CheckCircle2 className="h-4 w-4" /><span className="text-[11.5px] font-medium">Staff account active</span></div>
    </section>

    <div className="mb-3"><h3 className="text-[13px] font-semibold">Your workspace</h3><p className="mt-0.5 text-[10.5px] text-[#81766D]">Quick access to your employee tools</p></div>
    <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => <button key={card.title} disabled={!card.onClick} onClick={card.onClick} className="rounded-xl border bg-white p-4 text-left transition hover:border-orange-300 hover:shadow-sm disabled:cursor-default" style={{ borderColor: 'var(--line, #E8E0D8)' }}>
        <div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: card.featured ? '#FFF0E5' : '#F7F4F0', color: card.featured ? 'var(--orange, #FF6A00)' : '#6D625A' }}>{card.icon}</span>{card.onClick && <ArrowUpRight className="h-4 w-4 text-[#9A8E84]" />}</div>
        <h4 className="mt-4 text-[12.5px] font-semibold">{card.title}</h4><p className="mt-1.5 min-h-[54px] text-[11.5px] leading-5 text-[#81766D]">{card.description}</p><div className="mt-3 border-t pt-3 text-[10.5px] font-semibold capitalize" style={{ borderColor: 'var(--line, #E8E0D8)', color: card.onClick ? 'var(--orange, #FF6A00)' : '#6D625A' }}>{card.action}</div>
      </button>)}
    </section>

    <section className="mt-4 rounded-xl border bg-white p-4 sm:p-5" style={{ borderColor: 'var(--line, #E8E0D8)' }}><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-[#81766D]" /><h3 className="text-[12.5px] font-semibold">Account details</h3></div><div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-3" style={{ borderColor: 'var(--line, #E8E0D8)' }}><div><p className="text-[10.5px] text-[#81766D]">Name</p><p className="mt-1 text-[11.5px] font-medium">{staff.display_name}</p></div><div><p className="text-[10.5px] text-[#81766D]">Email</p><p className="mt-1 break-all text-[11.5px] font-medium">{staff.email}</p></div><div><p className="text-[10.5px] text-[#81766D]">Role</p><p className="mt-1 text-[11.5px] font-medium capitalize">{staff.role.replace(/_/g, ' ')}</p></div></div></section>
  </StaffShell>;
}