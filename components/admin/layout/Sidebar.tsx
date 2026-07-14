'use client';

import { useState } from 'react';
import Link from 'next/link';
import NavItem from './NavItem';
import { LayoutGrid, MapPin, Utensils, Bike, Settings, ArrowLeft, Menu, X, Inbox, AlertTriangle, Wallet, Megaphone } from 'lucide-react';
import useSession from '@/hooks/useSession';

const NAV_ITEMS = [
  { id: '/admin/dashboard', label: 'Dashboard', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: '/admin/zone-map', label: 'Zone Map', icon: <MapPin className="w-4 h-4" /> },
  { id: '/admin/restaurants', label: 'Restaurants', icon: <Utensils className="w-4 h-4" /> },
  { id: '/admin/riders', label: 'Riders', icon: <Bike className="w-4 h-4" /> },
  { id: '/admin/waitlist', label: 'Waitlist', icon: <Inbox className="w-4 h-4" /> },
  { id: '/admin/disputes', label: 'Disputes', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: '/admin/payouts', label: 'Payouts', icon: <Wallet className="w-4 h-4" /> },
  { id: '/admin/promotions', label: 'Promotions', icon: <Megaphone className="w-4 h-4" /> },
  { id: '/admin/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

function BrandBlock() {
  return (
    <div className="flex items-center gap-2 px-1.5">
      <Link href="/" className="mr-0.5 opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'white' }}>
        <ArrowLeft className="w-3.5 h-3.5" />
      </Link>
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

export default function Sidebar() {
  const { profile } = useSession();
  const [open, setOpen] = useState(false);

  const footer = (
    <div className="mt-auto pt-3 text-[10.5px] px-1.5" style={{ color: '#7A736A', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      {profile ? `Logged in as ${profile.full_name ?? profile.id}` : 'Logged in as Admin'}
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
