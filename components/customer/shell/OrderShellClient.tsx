'use client';

import {usePathname} from 'next/navigation';
import {TopNav} from '@/components/customer/shell/TopNav';
import {BottomNav} from '@/components/customer/shell/BottomNav';
import {RestaurantSwitchModal} from '@/components/customer/shared/RestaurantSwitchModal';
import {InstallPrompt} from '@/components/customer/shell/InstallPrompt';
import {ServiceWorkerRegister} from '@/components/customer/shell/ServiceWorkerRegister';

// Login and the payment callback are focused, single-purpose flows —
// hiding the primary nav here removes exit points at the moments a person
// is mid-auth or mid-payment-confirmation.
const NAV_HIDDEN_PREFIXES = ['/order/login', '/order/checkout/callback'];

export function OrderShellClient({children}: {children: React.ReactNode}) {
  const pathname = usePathname() ?? '';
  const hideNav = NAV_HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <div className="min-h-screen flex flex-col" style={{background: 'var(--white)'}}>
      <ServiceWorkerRegister />
      {!hideNav && <TopNav />}
      <main className={`flex-1 ${hideNav ? '' : 'pb-24 lg:pb-8'}`}>{children}</main>
      {!hideNav && <BottomNav />}
      <RestaurantSwitchModal />
      <InstallPrompt />
    </div>
  );
}
