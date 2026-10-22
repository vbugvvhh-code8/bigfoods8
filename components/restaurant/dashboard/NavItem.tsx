'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname();
  const isDashboardRoot = href === '/restaurant-portal/dashboard' || href === '/rider-portal/dashboard';
  // Keep the overview item active only on its own route; otherwise nested pages
  // such as Orders and Nearby Orders incorrectly highlight Overview as well.
  const isActive = pathname === href || (!isDashboardRoot && Boolean(pathname?.startsWith(href + '/')));

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[12.5px] font-medium text-left transition-all"
      style={{
        background: isActive ? 'rgba(255,106,0,0.12)' : 'transparent',
        color: isActive ? 'white' : '#B8B0A8',
        borderLeft: isActive ? '2px solid var(--orange)' : '2px solid transparent',
      }}
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}
