'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import NavItem from './NavItem';
import { LayoutGrid, MapPin, Utensils, Bike, Settings, Menu, X, Inbox, AlertTriangle, Wallet, Banknote, Megaphone, Users, LogOut, Route, ShieldCheck, Tags, ClipboardList, CalendarDays, Clock3, CalendarCheck, ArrowLeftRight, WalletCards, HeartPulse, ChevronDown } from 'lucide-react';
import useSession from '@/hooks/useSession';
import getBrowserSupabase from '@/lib/supabase/client';

const NAV_ITEMS = [
  { id: '/admin/dashboard', label: 'Dashboard', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: '/admin/staff', label: 'Staff Management', icon: <Users className="w-4 h-4" /> },
  { id: '/admin/zone-map', label: 'Zone Map', icon: <MapPin className="w-4 h-4" /> },
  { id: '/admin/areas', label: 'Service Areas', icon: <MapPin className="w-4 h-4" /> },
  { id: '/admin/seller-places', label: 'Seller Places', icon: <Users className="w-4 h-4" /> },
  { id: '/admin/dispatch', label: 'Dispatch', icon: <Route className="w-4 h-4" /> },
  { id: '/admin/users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { id: '/admin/restaurants', label: 'Restaurants', icon: <Utensils className="w-4 h-4" /> },
  { id: '/admin/subscriptions', label: 'Subscriptions', icon: <CalendarDays className="w-4 h-4" /> },
  { id: '/admin/menu-categories', label: 'Catalog Categories', icon: <Tags className="w-4 h-4" /> },
  { id: '/admin/menu-audit', label: 'Menu Change History', icon: <ClipboardList className="w-4 h-4" /> },
  { id: '/admin/registrations', label: 'CAC Checks', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: '/admin/riders', label: 'Riders', icon: <Bike className="w-4 h-4" /> },
  { id: '/admin/waitlist', label: 'Waitlist', icon: <Inbox className="w-4 h-4" /> },
  { id: '/admin/disputes', label: 'Disputes', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: '/admin/payouts', label: 'Rider Payouts', icon: <Wallet className="w-4 h-4" /> },
  { id: '/admin/restaurant-payouts', label: 'Restaurant Payouts', icon: <Banknote className="w-4 h-4" /> },
  { id: '/admin/promotions', label: 'Promotions', icon: <Megaphone className="w-4 h-4" /> },
  { id: '/admin/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

function BrandBlock() {
  return (
    <div className="flex items-center gap-2 px-1.5">
      <div className="w-[18px] h-[18px] rounded-[5px] flex-shrink-0" style={{ background: 'var(--orange)' }} />
      <span className="font-semibold text-[14px] text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        BigFoods
      </span>
    </div>
  );
}

function NavList({ items = NAV_ITEMS }: { items?: typeof NAV_ITEMS }) {
  const pathname = usePathname();
  const staffOpen = pathname.startsWith('/admin/staff');
  const [staffExpanded, setStaffExpanded] = useState(staffOpen);
  const staffLinks = [
    { href: '/admin/staff', label: 'Staff Directory' },
    { href: '/admin/staff/operations?tab=locations', label: 'Work Locations' },
    { href: '/admin/staff/operations?tab=shifts', label: 'Shift Templates' },
    { href: '/admin/staff/operations?tab=assign', label: 'Shift Schedule' },
    { href: '/admin/staff/operations?tab=qr', label: 'Premises QR / Token' },
    { href: '/admin/staff/operations?tab=attendance', label: 'Attendance' },
    { href: '/admin/staff/operations?tab=leave', label: 'Leave Requests' },
    { href: '/admin/staff/operations?tab=swaps', label: 'Shift Swaps' },
    { href: '/admin/staff/operations?tab=payroll', label: 'Payroll & Staff Health' },
  ];
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((n) => n.id === '/admin/staff' ? (
        <div key={n.id}>
          <button type="button" onClick={() => setStaffExpanded((v) => !v)} className="flex w-full items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[12.5px] font-medium text-left" style={{ background: staffOpen ? 'rgba(255,106,0,0.12)' : 'transparent', color: staffOpen ? 'white' : '#B8B0A8', borderLeft: staffOpen ? '2px solid var(--orange)' : '2px solid transparent' }}>
            {n.icon}<span className="flex-1">{n.label}</span><ChevronDown className={"h-4 w-4 transition-transform " + (staffExpanded ? 'rotate-180' : '')} />
          </button>
          {staffExpanded && <div className="ml-4 mt-1 mb-2 flex flex-col gap-0.5 border-l border-white/10 pl-2">
            {staffLinks.map((item) => {
              const path = item.href.split('?')[0];
              const active = pathname === path && (item.href.indexOf('?') < 0 || (typeof window !== 'undefined' && window.location.search === '?' + item.href.split('?')[1]));
              return <Link key={item.href} href={item.href} className="rounded-md px-2.5 py-2 text-[11.5px] leading-5" style={{ background: active ? 'rgba(255,106,0,0.12)' : 'transparent', color: active ? 'white' : '#B8B0A8' }}>{item.label}</Link>;
            })}
          </div>}
        </div>
      ) : <NavItem key={n.id} href={n.id} icon={n.icon} label={n.label} />)}
    </nav>
  );
}

function LogoutButton({ staffMode = false }: { staffMode?: boolean }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  async function handleLogout() {
    if (staffMode) {
      await fetch('/api/bigfoods-staff/session', { method: 'DELETE' });
      router.push('/staff/login');
      router.refresh();
      return;
    }
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[12.5px] font-medium text-left transition-all w-full"
      style={{ color: '#B8B0A8' }}
    >
      <LogOut className="w-4 h-4" />
      Log out
    </button>
  );
}

export default function Sidebar() {
  const { profile } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const footer = (
    <div className="mt-auto pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <LogoutButton staffMode={pathname.startsWith('/admin/staff')} />
      <div className="text-[10.5px] px-2.5 mt-1" style={{ color: '#7A736A' }}>
        {profile ? `Logged in as ${profile.full_name ?? profile.id}` : 'Logged in as Admin'}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: static sidebar, unchanged look */}
      <div className="hidden md:flex w-[200px] flex-shrink-0 flex-col py-5 px-3.5" style={{ background: 'var(--ink)', color: '#D8D2CB' }}>
        <div className="mb-7">
          <BrandBlock />
          <p className="text-[10px] uppercase tracking-widest px-1.5 mt-2" style={{ color: '#9C948A' }}>Admin Console</p>
        </div>
        <NavList />
        {footer}
      </div>

      {/* Mobile: top bar with menu toggle */}
      <div className="md:hidden flex items-center justify-between px-4 py-3" style={{ background: 'var(--ink)' }}>
        <BrandBlock />
        <button onClick={() => setOpen(true)} aria-label="Open menu" style={{ color: 'white' }}>
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile: slide-in drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-[240px] flex flex-col py-5 px-3.5" style={{ background: 'var(--ink)', color: '#D8D2CB' }}>
            <div className="flex items-center justify-between mb-7 px-1.5">
              <span className="font-semibold text-[14px] text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                BigFoods
              </span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" style={{ color: 'white' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div onClick={() => setOpen(false)}>
              <NavList />
            </div>
            {footer}
          </div>
          <div className="flex-1" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
