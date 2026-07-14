import {NextRequest, NextResponse} from 'next/server';
import {createServerSupabase} from './lib/supabase/server';
import type {CookieOptions} from '@supabase/ssr';

const ADMIN_LOGIN_PATH = '/admin/login';
const ADMIN_BASE = '/admin';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow the login page through
  if (pathname === ADMIN_LOGIN_PATH) return NextResponse.next();

  // Only protect /admin routes
  if (!pathname.startsWith(ADMIN_BASE)) return NextResponse.next();

  // Create a response we can mutate (so cookie set/delete operations are preserved)
  let response = NextResponse.next();

  // Build the cookie accessors expected by @supabase/ssr (getAll / setAll)
  const cookieAccessors = {
    getAll: () => {
      return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
    },
    setAll: (cookiesToSet: Array<{name: string; value: string; options?: CookieOptions}>) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
    },
  };

  const supabase = createServerSupabase({ cookies: cookieAccessors });

  try {
    // First validate that a real session exists. This also refreshes the
    // access token if needed, mutating cookies on the response.
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      const redirectUrl = new URL(ADMIN_LOGIN_PATH, req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // User is authenticated — now check admin role via the RPC.
    const { data, error } = await supabase.rpc('is_admin');

    const isAdmin = !!(data as any);

    if (!isAdmin || error) {
      const redirectUrl = new URL(ADMIN_LOGIN_PATH, req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // User is admin; return the (possibly mutated) response so any refreshed
    // session cookies propagate to the browser.
    return response;
  } catch (err) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, req.url));
  }
}

export const config = {
  // Match all /admin routes; login is allowed through above logic
  matcher: ['/admin/:path*'],
};
