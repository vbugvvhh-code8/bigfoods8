'use client';

import { ReactNode, useState } from 'react';
import SafeImage from '@/components/ui/SafeImage';
import { LOGO_URL } from '@/lib/brandImages';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid, CalendarDays, Menu, X, LogOut, UserRound, CalendarPlus, Repeat2, Users, ClipboardList, ShoppingCart, BarChart3, Utensils, Boxes, ChefHat, Settings, Bell, ChevronDown } from 'lucide-react';
import { canManageStaff, canUseStaffOperations, canAccessPos, hasPosPermission } from '@/lib/staff/access';

export default function ReportsShell({ children, title, subtitle, staffName, staffRole, staffPermissions }: { children: ReactNode; title: string; subtitle?: string; staffName?: string; staffRole?: string; staffPermissions?: unknown }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const profile = { role: staffRole, permissions: staffPermissions };
  const showStaffManagement = canManageStaff(profile);
  const showStaffOperations = canUseStaffOperations(profile);
  const showPos = canAccessPos(profile);
  const showOrders = ['owner', 'admin'].includes(staffRole || '') || hasPosPermission(profile, 'pos.reports');
  const showInventory = ['owner','admin','inventory'].includes(staffRole || '') || (Array.isArray(staffPermissions) && staffPermissions.some((p:any)=>['inventory.view','inventory.manage','inventory.receive','inventory.process'].includes(p)));
  const items = [
    { href: '/staff', label: 'Dashboard', icon: LayoutGrid },
    { href: '/staff/attendance', label: 'Attendance & schedule', icon: CalendarDays },
    ...(showStaffManagement ? [{ href: '/staff/manage', label: 'Staff management', icon: Users }] : []),
    ...(showPos ? [{ href: '/staff/pos', label: 'Point of sale', icon: ShoppingCart }, { href: '/staff/menu', label: 'Menu', icon: Utensils }] : []),
    ...(showOrders ? [{ href: '/staff/orders', label: 'Orders', icon: ClipboardList }, { href: '/staff/analytics', label: 'Reports', icon: BarChart3 }] : []),
    ...(showInventory ? [{ href: '/staff/inventory', label: 'Inventory', icon: Boxes }, { href: '/staff/kitchen', label: 'Kitchen', icon: ChefHat }] : []),
    ...(showStaffOperations ? [{ href: '/staff/operations', label: 'Staff operations', icon: ClipboardList }] : []),
    { href: '/staff/leave', label: 'Request leave', icon: CalendarPlus },
    { href: '/staff/shift-swaps', label: 'Shift swaps', icon: Repeat2 },
  ];
  async function logout() {
    await fetch('/api/bigfoods-staff/session', { method: 'DELETE' });
    router.replace('/staff/login');
    router.refresh();
  }
  const nav = <nav aria-label="Staff workspace navigation" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
    {items.map(item => {
      const active = pathname === item.href || (item.href !== '/staff' && pathname.startsWith(item.href + '/'));
      const Icon = item.icon;
      return <button key={item.href} onClick={() => { router.push(item.href); setOpen(false); }} className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition ${active ? 'bg-[#FFF0E7] text-[#E85D0A]' : 'text-[#526071] hover:bg-[#F4F6F9] hover:text-[#172033]'}`}>
        <Icon className="h-[17px] w-[17px] shrink-0" /><span className="min-w-0 flex-1 truncate">{item.label}</span>
      </button>;
    })}
  </nav>;
  return <div className="min-h-screen bg-[#F7F9FC] text-[#172033]" style={{fontFamily:"Inter, sans-serif"}}>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[212px] flex-col border-r border-[#E8EDF3] bg-white px-3 py-5 md:flex">
      <button onClick={()=>router.push('/staff')} className="mb-8 flex h-10 items-center gap-2 px-2 text-left">
        <SafeImage src={LOGO_URL} alt="BigFoods" className="h-8 w-8 rounded-lg object-contain" />
        <span className="text-[20px] font-bold tracking-tight text-[#141C2E]">Big<span className="text-[#F36B12]">Foods</span></span>
      </button>
      {nav}
      <div className="mt-auto border-t border-[#EDF0F4] pt-3">
        <button onClick={()=>router.push('/staff/settings')} className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-medium ${pathname==='/staff/settings'?'bg-[#FFF0E7] text-[#E85D0A]':'text-[#526071] hover:bg-[#F4F6F9]'}`}><Settings className="h-[17px] w-[17px]"/>Settings</button>
        <div className="mt-3 flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#EEF2F7] text-[#657386]"><UserRound className="h-4 w-4"/></span>
          <span className="min-w-0 flex-1"><b className="block truncate text-xs text-[#172033]">{staffName || 'Staff account'}</b><small className="block capitalize text-[10px] text-[#7A8798]">{staffRole || 'Staff'}</small></span>
          <button aria-label="Log out" onClick={logout} className="text-[#7A8798] hover:text-[#172033]"><LogOut className="h-4 w-4"/></button>
        </div>
      </div>
    </aside>
    <div className="md:pl-[212px]">
      <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between gap-4 border-b border-[#E8EDF3] bg-white/95 px-4 backdrop-blur sm:px-6">
        <button onClick={()=>setOpen(true)} aria-label="Open menu" className="text-[#526071] md:hidden"><Menu className="h-5 w-5"/></button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#8A96A6]">BigFoods / Staff</p>
          <h1 className="truncate text-[15px] font-semibold text-[#172033]">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full border border-[#E8EDF3] text-[#526071]"><Bell className="h-[18px] w-[18px]"/><i className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#E83E4D]"/></button>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#EEF2F7] text-[#657386]"><UserRound className="h-5 w-5"/></span>
            <span><b className="block max-w-[130px] truncate text-xs text-[#172033]">{staffName || 'Staff account'}</b><small className="block capitalize text-[10px] text-[#7A8798]">{staffRole || 'Staff'}</small></span>
            <ChevronDown className="h-4 w-4 text-[#7A8798]"/>
          </div>
          <button onClick={logout} className="hidden rounded-lg border border-[#E3E8EF] px-3 py-2 text-xs font-semibold text-[#526071] hover:bg-[#F7F9FC] sm:block">Log out</button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-7">
        <div className="mb-4"><h2 className="text-[28px] font-bold tracking-tight text-[#141C2E]">{title}</h2><p className="mt-0.5 text-[13px] text-[#687587]">{subtitle || 'Your staff workspace'}</p></div>
        {children}
      </main>
    </div>
    {open && <div className="fixed inset-0 z-50 flex md:hidden"><button aria-label="Close menu" onClick={()=>setOpen(false)} className="absolute inset-0 bg-black/30"/><aside className="relative flex h-full w-[270px] flex-col border-r border-[#E8EDF3] bg-white px-3 py-5"><div className="mb-7 flex items-center justify-between px-2"><span className="text-lg font-bold">Big<span className="text-[#F36B12]">Foods</span></span><button aria-label="Close menu" onClick={()=>setOpen(false)}><X className="h-5 w-5"/></button></div>{nav}</aside></div>}
  </div>;
}
