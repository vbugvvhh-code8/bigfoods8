import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // The bootstrap secret is validated only by the trusted Edge Function.
  // Requiring a second copy in Netlify caused "Bootstrap is not configured"
  // even when BIGFOODS_STAFF_BOOTSTRAP_SECRET was set in Supabase.
  if (!base || !key) {
    return NextResponse.json(
      { error: "Staff service is not configured. Check the Supabase URL and anon key in the deployment environment." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const body = await req.json();
    if (
      typeof body.bootstrap_secret !== "string" ||
      body.bootstrap_secret.length < 32 ||
      typeof body.email !== "string" ||
      typeof body.display_name !== "string" ||
      typeof body.password !== "string"
    ) {
      return NextResponse.json({ error: "Enter the bootstrap secret and valid owner details." }, { status: 400 });
    }

    const response = await fetch(`${base}/functions/v1/bigfoods-staff-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify({
        action: "bootstrap",
        bootstrap_secret: body.bootstrap_secret,
        email: body.email,
        display_name: body.display_name,
        password: body.password,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({ error: "Invalid response from staff service" }));
    return NextResponse.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to initialize owner account" }, { status: 500 });
  }
}
