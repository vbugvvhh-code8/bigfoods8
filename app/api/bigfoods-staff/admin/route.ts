import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const COOKIE = "bf_staff_session";
export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  const authorization = req.headers.get("authorization");
  if (!token && !authorization) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return NextResponse.json({ error: "Staff service unavailable" }, { status: 503 });
  try {
    const body = await req.json();
    const response = await fetch(`${base}/functions/v1/bigfoods-staff-admin`, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: key, ...(authorization ? { Authorization: authorization } : {}) },
      body: JSON.stringify({ ...body, ...(body.action === "create" && typeof body.password === "string" ? { temporary_password: body.password } : {}), ...(token ? { session_token: token } : {}) }), cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    return NextResponse.json(result, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
