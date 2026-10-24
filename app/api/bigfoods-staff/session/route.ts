import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const COOKIE = "bf_staff_session";
async function callSession(token: string, action: "validate" | "logout" = "validate") {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return { ok: false, status: 503, body: { error: "Session service unavailable" } };
  const response = await fetch(`${base}/functions/v1/bigfoods-staff-session`, { method: "POST", headers: { "Content-Type": "application/json", apikey: key }, body: JSON.stringify({ token, action }), cache: "no-store" });
  return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) };
}
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const result = await callSession(token);
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (token) await callSession(token, "logout");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: new Date(0) });
  return res;
}