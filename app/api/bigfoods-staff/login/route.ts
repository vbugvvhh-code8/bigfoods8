import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const COOKIE = "bf_staff_session";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!base || !key) return NextResponse.json({ error: "Login service unavailable" }, { status: 503 });
    const response = await fetch(`${base}/functions/v1/bigfoods-staff-login`, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: key }, body: JSON.stringify({ email, password }), cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.session_token !== "string") return NextResponse.json({ error: result.error ?? "Unable to sign in" }, { status: response.status || 401 });
    const res = NextResponse.json({ staff: result.staff, expires_at: result.expires_at });
    res.cookies.set(COOKIE, result.session_token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: new Date(result.expires_at) });
    return res;
  } catch { return NextResponse.json({ error: "Unable to sign in" }, { status: 500 }); }
}