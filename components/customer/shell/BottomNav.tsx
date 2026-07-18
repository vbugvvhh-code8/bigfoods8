'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Home, ClipboardList, User} from 'lucide-react';

const ITEMS = [
  {href: '/order', label: 'Home', icon: Home},
  {href: '/order/orders', label: 'Orders', icon: ClipboardList},
  {href: '/order/profile', label: 'Profile', icon: User},
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex bg-white"
      style={{borderTop: '1px solid var(--line)', paddingBottom: 'env(safe-area-inset-bottom)'}}
    >
      {ITEMS.map(({href, label, icon: Icon}) => {
        const active = href === '/order' ? pathname === '/order' : pathname?.startsWith(href);
        const color = active ? 'var(--orange)' : 'var(--gray)';
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5"
          >
            <Icon className="w-5 h-5" style={{color}} strokeWidth={active ? 2.25 : 1.75} />
            <span className="text-[10.5px] font-medium" style={{color}}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
