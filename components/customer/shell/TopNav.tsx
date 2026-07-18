'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Home, ClipboardList, User} from 'lucide-react';

const LOGO_URL =
  'https://dpioixansygkjdbphfdj.supabase.co/storage/v1/object/public/product-images/0.4927238865897102.webp';

const ITEMS = [
  {href: '/order', label: 'Home', icon: Home},
  {href: '/order/orders', label: 'Orders', icon: ClipboardList},
  {href: '/order/profile', label: 'Profile', icon: User},
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header
      className="hidden lg:flex sticky top-0 z-40 items-center justify-between px-8 h-16 bg-white"
      style={{borderBottom: '1px solid var(--line)'}}
    >
      <Link href="/order" className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0" style={{background: 'var(--orange)'}}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt="BigFoods" className="w-full h-full object-cover" />
        </div>
        <span className="font-display font-semibold text-[16px]" style={{color: 'var(--ink)'}}>
          BigFoods
        </span>
      </Link>

      <nav className="flex items-center gap-6">
        {ITEMS.map(({href, label, icon: Icon}) => {
          const active = href === '/order' ? pathname === '/order' : pathname?.startsWith(href);
          const color = active ? 'var(--orange)' : 'var(--gray)';
          return (
            <Link key={href} href={href} className="flex items-center gap-1.5 text-[13px] font-medium" style={{color}}>
              <Icon className="w-4 h-4" strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
