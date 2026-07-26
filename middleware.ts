import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from './lib/supabase/server';
import type { CookieOptions } from '@supabase/ssr';
import { resolveRestaurantEntryPath } from './lib/resolveRestaurantEntryPath';

const ADMIN_LOGIN_PATH = '/admin/login';
const ADMIN_BASE = '/admin';
const RESTAURANT_LOGIN_PATH = '/restaurant-portal/login';
const RESTAURANT_DASHBOARD_BASE = '/restaurant-portal/dashboard';
const RESTAURANT_ONBOARDING_BASE = '/restaurant-portal/onboarding';

// Duplicated from ONBOARDING_STEPS in hooks/useOnboardingSession.ts on
// purpose — that file is a 'use client' hook, and middleware runs in the
// Edge runtime outside React, so it can't safely import it. Keep this order
// in sync if the onboarding step sequence ever changes.
const ONBOARDING_PATH_ORDER = [
  '/restaurant-portal/onboarding/seller-info',
  '/restaurant-portal/onboarding/restaurant-info',
  '/restaurant-portal/onboarding/location',
  '/restaurant-portal/onboarding/delivery-zone',
  '/restaurant-portal/onboarding/menu',
  '/restaurant-portal/onboarding/payment',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow the login pages through
  if (pathname === ADMIN_LOGIN_PATH || pathname === RESTAURANT_LOGIN_PATH) {
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith(ADMIN_BASE);
  const isRestaurantDashboardRoute = pathname.startsWith(RESTAURANT_DASHBOARD_BASE);
  const isRestaurantOnboardingRoute = pathname.startsWith(RESTAURANT_ONBOARDING_BASE);

  if (!isAdminRoute && !isRestaurantDashboardRoute && !isRestaurantOnboardingRoute) {
    return NextResponse.next();
  }

  // Create a response we can mutate (so cookie set/delete operations are preserved)
  let response = NextResponse.next();

  // Build the cookie accessors expected by @supabase/ssr (getAll / setAll)
  const cookieAccessors = {
    getAll: () => {
      return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
    },
    setAll: (cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
    },
  };

  const supabase = createServerSupabase({ cookies: cookieAccessors });

  try {
    // First validate that a real session exists. This also refreshes the
    // access token if needed, mutating cookies on the response.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (isAdminRoute) {
      if (userError || !user) {
        return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, req.url));
      }

      // User is authenticated — now check admin role via the RPC.
      const { data, error } = await supabase.rpc('is_admin');
      const isAdmin = !!(data as any);

      if (!isAdmin || error) {
        return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, req.url));
      }

      // User is admin; return the (possibly mutated) response so any
      // refreshed session cookies propagate to the browser.
      return response;
    }

    if (isRestaurantOnboardingRoute) {
      // seller-info is the actual entry point — email OTP verification
      // inside it is what creates the session in the first place, so it
      // must stay reachable before any auth exists.
      if ((userError || !user) && pathname !== '/restaurant-portal/onboarding/seller-info') {
        return NextResponse.redirect(new URL('/restaurant-portal/onboarding/seller-info', req.url));
      }
      if (userError || !user) {
        return response;
      }

      const resolved = await resolveRestaurantEntryPath(supabase);
      const resolvedIndex = ONBOARDING_PATH_ORDER.indexOf(resolved);
      const currentIndex = ONBOARDING_PATH_ORDER.indexOf(pathname);

      // Only block jumping AHEAD of the first incomplete step — freely
      // revisiting an already-completed step is harmless and often useful
      // (e.g. going back to double check the location step).
      if (resolvedIndex !== -1 && currentIndex !== -1 && currentIndex > resolvedIndex) {
        return NextResponse.redirect(new URL(resolved, req.url));
      }

      return response;
    }

    // isRestaurantDashboardRoute
    if (userError || !user) {
      return NextResponse.redirect(new URL(RESTAURANT_LOGIN_PATH, req.url));
    }

    // Catches a session that was already active before the account got
    // blocked — the login page's own check only runs at sign-in time.
    const { data: profile } = await supabase.from('profiles').select('blocked').eq('id', user.id).maybeSingle();
    if (profile?.blocked) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL(RESTAURANT_LOGIN_PATH, req.url));
    }

    // Reuses the exact same resolver the login page uses, so "what's
    // actually finished" is defined in exactly one place. If onboarding
    // isn't complete, this sends them to the specific step they left off
    // at instead of letting them into a dashboard for a restaurant that
    // doesn't fully exist yet.
    const nextPath = await resolveRestaurantEntryPath(supabase);
    if (nextPath !== RESTAURANT_DASHBOARD_BASE) {
      return NextResponse.redirect(new URL(nextPath, req.url));
    }

    return response;
  } catch (err) {
    return NextResponse.redirect(
      new URL(isAdminRoute ? ADMIN_LOGIN_PATH : RESTAURANT_LOGIN_PATH, req.url)
    );
  }
}

export const config = {
  // Match /admin routes, the restaurant dashboard, and the onboarding flow;
  // the respective login/entry pages are allowed through above.
  matcher: ['/admin/:path*', '/restaurant-portal/dashboard/:path*', '/restaurant-portal/onboarding/:path*'],
};
