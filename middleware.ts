import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from './lib/supabase/server';
import type { CookieOptions } from '@supabase/ssr';
import { resolveRestaurantEntryPath } from './lib/resolveRestaurantEntryPath';

const ADMIN_LOGIN_PATH = '/admin/login';
const ADMIN_BASE = '/admin';
const RESTAURANT_LOGIN_PATH = '/restaurant-portal/login';
const RESTAURANT_DASHBOARD_BASE = '/restaurant-portal/dashboard';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow the login pages through
  if (pathname === ADMIN_LOGIN_PATH || pathname === RESTAURANT_LOGIN_PATH) {
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith(ADMIN_BASE);
  const isRestaurantDashboardRoute = pathname.startsWith(RESTAURANT_DASHBOARD_BASE);

  // Only protect /admin and /restaurant-portal/dashboard routes
  if (!isAdminRoute && !isRestaurantDashboardRoute) return NextResponse.next();

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
  // Match all /admin routes and the restaurant dashboard; the respective
  // login pages are allowed through above.
  matcher: ['/admin/:path*', '/restaurant-portal/dashboard/:path*'],
};
