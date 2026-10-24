import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const COOKIE = "bf_staff_session";
export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  const authorization = req.headers.get("authorization");
  if (!token && !authorization) return NextResponse.json({ error: "Unauthenticated" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return NextResponse.json({ error: "Staff service unavailable" }, { status: 503 });
  try {
    const body = await req.json();
    const response = await fetch(`${base}/functions/v1/bigfoods-staff-operations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, ...(authorization ? { Authorization: authorization } : {}) },
      body: JSON.stringify({ ...body, ...(token ? { session_token: token } : {}) }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({ error: "Invalid staff operations response" }));
    return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
