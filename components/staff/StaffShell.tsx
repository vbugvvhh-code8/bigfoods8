'use client';

import { ReactNode, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid, CalendarDays, Menu, X, LogOut, UserRound, CalendarPlus, Repeat2, ShoppingCart, Users, ClipboardList, PackageOpen, Warehouse, ChevronDown, MapPin, Clock3, CalendarCheck, QrCode, ClipboardCheck, HeartPulse, Target, Settings } from 'lucide-react';

export default function StaffShell({ children, title, subtitle, staffName, staffRole, staffPermissions }: { children: ReactNode; title: string; subtitle?: string; staffName?: string; staffRole?: string; staffPermissions?: unknown }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(pathname.startsWith('/staff/operations'));

  async function logout() {
    await fetch('/api/bigfoods-staff/session', { method: 'DELETE' });
    router.replace('/staff/login');
    router.refresh();
  }

  const permissions = Array.isArray(staffPermissions) ? staffPermissions : [];
  const canUsePos = ['owner', 'admin', 'pos'].includes((staffRole || '').toLowerCase()) || permissions.includes('pos.sell') || permissions.includes('pos.view');
  const items = [
    { href: '/staff', label: 'Dashboard', icon: <LayoutGrid className="h-4 w-4" /> },
    { href: '/staff/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
    ...(canUsePos ? [{ href: '/staff/pos', label: 'POS', icon: <ShoppingCart className="h-4 w-4" /> }] : []),
    ...(['owner', 'admin'].includes((staffRole || '').toLowerCase()) || permissions.includes('inventory.manage') || permissions.includes('pos.manage') || permissions.includes('pos.catalogue.manage') ? [{ href: '/staff/pos-catalogue', label: 'POS Catalogue', icon: <PackageOpen className="h-4 w-4" /> }] : []),
    ...(['owner', 'admin', 'inventory'].includes((staffRole || '').toLowerCase()) || permissions.includes('inventory.manage') || permissions.includes('inventory.view') ? [{ href: '/staff/inventory', label: 'Inventory', icon: <Warehouse className="h-4 w-4" /> }] : []),
    { href: '/staff/attendance', label: 'Attendance & schedule', icon: <CalendarDays className="h-4 w-4" /> },
    ...(['owner', 'admin'].includes((staffRole || '').toLowerCase()) || permissions.includes('staff.manage') ? [
      { href: '/staff/manage', label: 'Staff management', icon: <Users className="h-4 w-4" /> },
      { href: '/staff/operations', label: 'Staff operations', icon: <ClipboardList className="h-4 w-4" /> },
    ] : []),
    { href: '/staff/leave', label: 'Request leave', icon: <CalendarPlus className="h-4 w-4" /> },
    { href: '/staff/shift-swaps', label: 'Shift swaps', icon: <Repeat2 className="h-4 w-4" /> },
  ];

  const operationTabs = [
    { tab: 'locations', label: 'Work locations', icon: <MapPin className="h-3.5 w-3.5" /> },
    { tab: 'shifts', label: 'Shift templates', icon: <Clock3 className="h-3.5 w-3.5" /> },
    { tab: 'assign', label: 'Staff shift schedule', icon: <CalendarCheck className="h-3.5 w-3.5" /> },
    { tab: 'qr', label: 'Premises QR / token', icon: <QrCode className="h-3.5 w-3.5" /> },
    { tab: 'attendance', label: 'Staff attendance', icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
    { tab: 'leave', label: 'Leave requests', icon: <CalendarPlus className="h-3.5 w-3.5" /> },
    { tab: 'swaps', label: 'Shift swaps', icon: <Repeat2 className="h-3.5 w-3.5" /> },
    { tab: 'payroll', label: 'Payroll & staff health', icon: <HeartPulse className="h-3.5 w-3.5" /> },
    { tab: 'pool', label: 'Consistency pool', icon: <Target className="h-3.5 w-3.5" /> },
  ];
  const nav = (closeOnClick = false) => (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== '/staff' && pathname.startsWith(item.href + '/'));
        if (item.href === '/staff/operations') {
          return <div key={item.href}>
            <button onClick={() => { setOperationsOpen(value => !value); if (!pathname.startsWith('/staff/operations')) router.push('/staff/operations?tab=locations'); }} aria-expanded={operationsOpen} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[12.5px] font-medium transition-all" style={{ background: active ? 'rgba(255,106,0,0.12)' : 'transparent', color: active ? '#FFFFFF' : '#B8B0A8', borderLeft: active ? '2px solid #FF6A00' : '2px solid transparent' }}>
              {item.icon}<span className="flex-1">Staff Operations</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${operationsOpen ? 'rotate-180' : ''}`} />
            </button>
            {operationsOpen && <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-white/10 pl-2">
              {operationTabs.map(section => <button key={section.tab} onClick={() => { router.push(`/staff/operations?tab=${section.tab}`); if (closeOnClick) setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[11px] font-medium transition hover:bg-white/[.06]" style={{ color: active ? '#D8D2CB' : '#B8B0A8' }}>{section.icon}<span>{section.label}</span></button>)}
            </div>}
          </div>;
        }
        return <button key={item.href} onClick={() => { router.push(item.href); if (closeOnClick) setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[12.5px] font-medium transition-all" style={{ background: active ? 'rgba(255,106,0,0.12)' : 'transparent', color: active ? '#FFFFFF' : '#B8B0A8', borderLeft: active ? '2px solid #FF6A00' : '2px solid transparent' }}>{item.icon}<span>{item.label}</span></button>;
      })}
    </nav>
  );

  const footer = <div className="mt-auto border-t border-white/[.08] pt-3"><button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[12.5px] font-medium text-[#B8B0A8] transition hover:bg-white/[.06] hover:text-white"><LogOut className="h-4 w-4" />Log out</button><div className="mt-1 flex items-center gap-2 px-2.5 text-[10.5px] text-[#7A736A]"><UserRound className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{staffName || 'Logged in as Staff'}</span></div></div>;

  return <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'var(--ink, #28231F)', background: '#F7F4F0' }}>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[200px] flex-col px-3.5 py-5 md:flex" style={{ background: 'var(--ink, #211A17)', color: '#D8D2CB' }}>
      <div className="mb-7"><div className="flex items-center gap-2 px-1.5"><div className="h-[18px] w-[18px] shrink-0 rounded-[5px]" style={{ background: 'var(--orange, #FF6A00)' }} /><span className="text-[14px] font-semibold tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>BigFoods</span></div><p className="mt-2 px-1.5 text-[10px] uppercase tracking-widest text-[#9C948A]">Staff Workspace</p></div>
      {nav()}
      {footer}
    </aside>
    <div className="md:pl-[200px]">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 sm:px-7" style={{ background: 'var(--ink, #211A17)' }}>
        <div className="flex items-center gap-3"><button onClick={() => setOpen(true)} aria-label="Open menu" className="text-white md:hidden"><Menu className="h-5 w-5" /></button><div><p className="text-[10px] uppercase tracking-widest text-[#9C948A]">BigFoods / Staff</p><h1 className="mt-0.5 text-[15px] font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h1></div></div>
        <div className="flex items-center gap-3"><div className="hidden max-w-[220px] truncate text-[11px] text-[#B8B0A8] sm:block">{staffName || 'Staff account'}</div><button onClick={logout} className="rounded-lg border border-white/15 px-3 py-2 text-[11.5px] font-medium text-[#E4DDD6] transition hover:bg-white/[.06]">Log out</button></div>
      </header>
      <main className="w-full max-w-[1180px] px-4 py-4 sm:px-7 sm:py-6"><div className="mb-4"><h2 className="text-[20px] font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2><p className="mt-0.5 text-[11.5px] text-[#81766D]">{subtitle || 'Your staff workspace'}</p></div>{children}</main>
    </div>
    {open && <div className="fixed inset-0 z-50 flex md:hidden"><button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" /><aside className="relative flex h-full w-[240px] flex-col px-3.5 py-5" style={{ background: 'var(--ink, #211A17)', color: '#D8D2CB' }}><div className="mb-7 flex items-center justify-between px-1.5"><div><div className="flex items-center gap-2"><div className="h-[18px] w-[18px] rounded-[5px]" style={{ background: 'var(--orange, #FF6A00)' }} /><span className="text-[14px] font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>BigFoods</span></div><p className="mt-2 text-[10px] uppercase tracking-widest text-[#9C948A]">Staff Workspace</p></div><button aria-label="Close menu" onClick={() => setOpen(false)} className="text-white"><X className="h-5 w-5" /></button></div>{nav(true)}{footer}</aside></div>}
  </div>;
}