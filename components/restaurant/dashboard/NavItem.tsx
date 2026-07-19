'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(href + '/');

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
