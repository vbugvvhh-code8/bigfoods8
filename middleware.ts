import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from './lib/supabase/server';
import type { CookieOptions } from '@supabase/ssr';
import { resolveRestaurantEntryPath } from './lib/resolveRestaurantEntryPath';

const ADMIN_LOGIN_PATH = '/admin/login';
const ADMIN_BASE = '/admin';
const RESTAURANT_LOGIN_PATH = '/restaurant-portal/login';
const RESTAURANT_DASHBOARD_BASE = '/restaurant-portal/dashboard';
const RESTAURANT_ONBOARDING_BASE = '/restaurant-portal/onboarding';
const RESTAURANT_PAYMENT_PATH = '/restaurant-portal/onboarding/payment';
const RIDER_LOGIN_PATH = '/rider-portal/login';
const RIDER_ONBOARDING_DETAILS_PATH = '/rider-portal/onboarding/details';
const RIDER_ONBOARDING_PAYMENT_PATH = '/rider-portal/onboarding/payment';
const RIDER_DASHBOARD_BASE = '/rider-portal/dashboard';

const ONBOARDING_PATH_ORDER = [
  '/restaurant-portal/onboarding/agreement',
  '/restaurant-portal/onboarding/seller-info',
  '/restaurant-portal/onboarding/restaurant-info',
  '/restaurant-portal/onboarding/location',
  '/restaurant-portal/onboarding/bank',
  '/restaurant-portal/onboarding/payment',
  '/restaurant-portal/onboarding/delivery-zone',
  '/restaurant-portal/onboarding/menu',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === ADMIN_LOGIN_PATH || pathname === RESTAURANT_LOGIN_PATH || pathname === RIDER_LOGIN_PATH) {
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith(ADMIN_BASE);
  const isRestaurantDashboardRoute = pathname.startsWith(RESTAURANT_DASHBOARD_BASE);
  const isRestaurantOnboardingRoute = pathname.startsWith(RESTAURANT_ONBOARDING_BASE);
  const isRiderDashboardRoute = pathname.startsWith(RIDER_DASHBOARD_BASE);

  if (!isAdminRoute && !isRestaurantDashboardRoute && !isRestaurantOnboardingRoute && !isRiderDashboardRoute) {
    return NextResponse.next();
  }

  let response = NextResponse.next();
  const cookieAccessors = {
    getAll: () => req.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) => {
      cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  };

  const supabase = createServerSupabase({ cookies: cookieAccessors });

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (isAdminRoute) {
      if (userError || !user) return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, req.url));
      const { data, error } = await supabase.rpc('is_admin');
      if (error || !data) return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, req.url));
      return response;
    }

    if (isRestaurantOnboardingRoute) {
      const publicSteps = ['/restaurant-portal/onboarding/agreement', '/restaurant-portal/onboarding/seller-info'];
      if ((userError || !user) && !publicSteps.includes(pathname)) {
        return NextResponse.redirect(new URL('/restaurant-portal/onboarding/seller-info', req.url));
      }
      if (userError || !user) return response;

      const resolved = await resolveRestaurantEntryPath(supabase);
      const resolvedIndex = ONBOARDING_PATH_ORDER.indexOf(resolved);
      const currentIndex = ONBOARDING_PATH_ORDER.indexOf(pathname);
      if (resolvedIndex !== -1 && currentIndex !== -1 && currentIndex > resolvedIndex) {
        return NextResponse.redirect(new URL(resolved, req.url));
      }
      return response;
    }

    if (isRestaurantDashboardRoute) {
      if (userError || !user) return NextResponse.redirect(new URL(RESTAURANT_LOGIN_PATH, req.url));

      const { data: profile } = await supabase.from('profiles').select('blocked').eq('id', user.id).maybeSingle();
      if (profile?.blocked) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL(RESTAURANT_LOGIN_PATH, req.url));
      }

      // The resolver is the source of truth for new and legacy onboarding.
      // For new sellers it requires a successful onboarding_plan transaction;
      // pending/failed/cancelled transactions never satisfy that check.
      const nextPath = await resolveRestaurantEntryPath(supabase);
      if (nextPath !== RESTAURANT_DASHBOARD_BASE) {
        return NextResponse.redirect(new URL(nextPath, req.url));
      }
      return response;
    }

    if (isRiderDashboardRoute) {
      if (userError || !user) return NextResponse.redirect(new URL(RIDER_LOGIN_PATH, req.url));

      const { data: rider, error: riderError } = await supabase
        .from('riders')
        .select('verification_fee_paid, approval_status')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (riderError || !rider) {
        return NextResponse.redirect(new URL(RIDER_ONBOARDING_DETAILS_PATH, req.url));
      }
      if (!rider.verification_fee_paid) {
        return NextResponse.redirect(new URL(RIDER_ONBOARDING_PAYMENT_PATH, req.url));
      }
      // Paid but not yet approved riders reach a status-only screen from the
      // dashboard layout; its children are not rendered until approved.
      return response;
    }

    return response;
  } catch {
    const isRiderRoute = pathname.startsWith('/rider-portal');
    return NextResponse.redirect(
      new URL(isAdminRoute ? ADMIN_LOGIN_PATH : isRiderRoute ? RIDER_LOGIN_PATH : RESTAURANT_LOGIN_PATH, req.url)
    );
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/restaurant-portal/dashboard/:path*',
    '/restaurant-portal/onboarding/:path*',
    '/rider-portal/dashboard/:path*',
  ],
};
