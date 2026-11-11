'use client';

import {usePathname} from 'next/navigation';
import {TopNav} from '@/components/customer/shell/TopNav';
import {BottomNav} from '@/components/customer/shell/BottomNav';
import {InstallPrompt} from '@/components/customer/shell/InstallPrompt';
import {ServiceWorkerRegister} from '@/components/customer/shell/ServiceWorkerRegister';

// Auth routes and the payment callback are focused, single-purpose flows —
// hiding the primary nav here removes exit points at the moments a person
// is mid-auth or mid-payment-confirmation.
const NAV_HIDDEN_PREFIXES = [
  '/order/login',
  '/order/signup',
  '/order/forgot-password',
  '/order/reset-password',
  '/order/checkout/callback',
];

export function OrderShellClient({children}: {children: React.ReactNode}) {
  const pathname = usePathname() ?? '';
  const hideNav = NAV_HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  const isMenuItemDetails = /\/order\/restaurant\/[^/]+\/item\//.test(pathname);
  const isRestaurantMenu = /^\/order\/restaurant\/[^/]+\/?$/.test(pathname);

  return (
    <div className="min-h-screen flex flex-col" style={{background: "radial-gradient(ellipse at top left, rgba(255, 220, 185, 0.32), transparent 42%), linear-gradient(180deg, #FFFCF8 0%, #FFF8F0 100%)"}}>
      <ServiceWorkerRegister />
      {!hideNav && <TopNav />}
      <main className={`${isMenuItemDetails || isRestaurantMenu ? 'flex-none' : 'flex-1'} ${hideNav || isMenuItemDetails || isRestaurantMenu ? '' : 'pb-24 lg:pb-8'}`}>{children}</main>
      {!hideNav && <BottomNav />}
      <InstallPrompt />
    </div>
  );
}
