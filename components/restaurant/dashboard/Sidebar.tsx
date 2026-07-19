'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NavItem from './NavItem';
import { LayoutGrid, ClipboardList, UtensilsCrossed, User, Wallet, BarChart3, Settings, Menu, X, LogOut } from 'lucide-react';
import getBrowserSupabase from '@/lib/supabase/client';

const NAV_ITEMS = [
  { id: '/restaurant-portal/dashboard', label: 'Overview', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: '/restaurant-portal/dashboard/orders', label: 'Orders', icon: <ClipboardList className="w-4 h-4" /> },
  { id: '/restaurant-portal/dashboard/menu', label: 'Menu', icon: <UtensilsCrossed className="w-4 h-4" /> },
  { id: '/restaurant-portal/dashboard/profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: '/restaurant-portal/dashboard/wallet', label: 'Wallet', icon: <Wallet className="w-4 h-4" /> },
  { id: '/restaurant-portal/dashboard/reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
  { id: '/restaurant-portal/dashboard/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
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

function NavList() {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((n) => (
        <NavItem key={n.id} href={n.id} icon={n.icon} label={n.label} />
      ))}
    </nav>
  );
}

function LogoutButton() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/restaurant-portal/login');
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

export default function Sidebar({ restaurantName }: { restaurantName?: string }) {
  const [open, setOpen] = useState(false);

  const footer = (
    <div className="mt-auto pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <LogoutButton />
      {restaurantName && (
        <div className="text-[10.5px] px-2.5 mt-1 truncate" style={{ color: '#7A736A' }}>
          {restaurantName}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: static sidebar */}
      <div className="hidden md:flex w-[200px] flex-shrink-0 flex-col py-5 px-3.5" style={{ background: 'var(--ink)', color: '#D8D2CB' }}>
        <div className="mb-7">
          <BrandBlock />
          <p className="text-[10px] uppercase tracking-widest px-1.5 mt-2" style={{ color: '#9C948A' }}>Restaurant Portal</p>
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
