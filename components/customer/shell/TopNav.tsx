'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {Home, ClipboardList, User, MapPin, CalendarDays, ArrowLeft} from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import {useGeolocation} from '@/hooks/useGeolocation';
import {useEffect} from 'react';
import {useRestaurant} from '@/hooks/useRestaurants';
import { LOGO_URL } from '@/lib/brandImages';


const ITEMS = [
  {href: '/order', label: 'Home', icon: Home},
  {href: '/order/orders', label: 'Orders', icon: ClipboardList},
  {href: '/subscriptions', label: 'Subscription', icon: CalendarDays},
  {href: '/order/profile', label: 'Profile', icon: User},
];

function MobileTopBar({showBack, restaurantName}: {showBack: boolean; restaurantName?: string}) {
  const router = useRouter();
  const {lgaGuess, nigerianState, requestLocation, isLoading} = useGeolocation();

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header
      className="flex lg:hidden sticky top-0 z-40 items-center justify-between px-4 h-14 bg-white"
      style={{borderBottom: '1px solid var(--line)'}}
    >
      <div className="flex min-w-0 items-center gap-2">
        {showBack && (
          <button
            type="button"
            onClick={() => router.push('/order')}
            aria-label="Back to restaurants"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:bg-orange-50"
            style={{color:'var(--orange)'}}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {showBack ? (
          <span className="max-w-[190px] truncate font-display text-[15px] font-semibold" style={{color:'var(--ink)'}}>{restaurantName || 'Restaurant'}</span>
        ) : (
          <Link href="/order" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0" style={{background: 'var(--orange)'}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <SafeImage src={LOGO_URL} alt="BigFoods" className="h-full w-full object-cover" />
            </div>
            <span className="font-display text-[15px] font-semibold" style={{color:'var(--ink)'}}>BigFoods</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1 text-[11.5px]" style={{color: 'var(--gray)'}}>
        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="max-w-[130px] truncate">
          {isLoading ? 'Locating…' : lgaGuess ? (nigerianState ? `${lgaGuess}, ${nigerianState}` : lgaGuess) : 'Set location'}
        </span>
      </div>
    </header>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const showBack = pathname?.startsWith('/order/restaurant/') ?? false;
  const restaurantId = showBack ? pathname.split('/')[3] : '';
  const {restaurant} = useRestaurant(restaurantId);

  return (
    <>
      <MobileTopBar showBack={showBack} restaurantName={restaurant?.name} />

      {/* Desktop: unchanged nav bar */}
      <header
        className="hidden lg:flex sticky top-0 z-40 items-center justify-between px-8 h-16 bg-white"
        style={{borderBottom: '1px solid var(--line)'}}
      >
        <div className="flex items-center gap-3">
          {showBack && (
            <button type="button" onClick={() => router.push('/order')} aria-label="Back to restaurants" className="flex h-9 w-9 items-center justify-center rounded-full border" style={{color:'var(--orange)',borderColor:'var(--line)'}}>
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          {showBack ? (
            <span className="max-w-[260px] truncate font-display text-base font-semibold" style={{color:'var(--ink)'}}>{restaurant?.name || 'Restaurant'}</span>
          ) : (
            <Link href="/order" className="flex items-center gap-2.5">
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-lg" style={{background:'var(--orange)'}}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <SafeImage src={LOGO_URL} alt="BigFoods" className="h-full w-full object-cover" />
              </div>
              <span className="font-display text-base font-semibold" style={{color:'var(--ink)'}}>BigFoods</span>
            </Link>
          )}
        </div>

        <nav className="flex items-center gap-6">
          {ITEMS.map(({href, label, icon: Icon}) => {
            const activeHref = href.split('#')[0];
            const active = activeHref === '/order' ? pathname === '/order' : pathname?.startsWith(activeHref);
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
    </>
  );
}
