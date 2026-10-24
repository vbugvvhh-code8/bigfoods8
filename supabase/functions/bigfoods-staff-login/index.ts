import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get("STAFF_LOGIN_ALLOWED_ORIGIN") ?? "https://bigfoods.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
function bytesToHex(bytes: Uint8Array): string { return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""); }
function hexToBytes(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return new Uint8Array();
  return new Uint8Array(hex.match(/.{2}/g)!.map((v) => parseInt(v, 16)));
}
async function sha256(value: string): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}
async function verifyPassword(password: string, saltHex: string, expectedHex: string): Promise<boolean> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: hexToBytes(saltHex), iterations: 310000, hash: "SHA-256" }, key, 256);
  const actual = new Uint8Array(bits), expected = hexToBytes(expectedHex);
  if (actual.length !== expected.length || actual.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
function randomHex(size: number): string { return bytesToHex(crypto.getRandomValues(new Uint8Array(size))); }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const origin = req.headers.get("Origin");
  if (origin && origin !== allowedOrigin) return json({ error: "Not allowed" }, 403);

  let email = "", password = "";
  try {
    const body = await req.json();
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch { return json({ error: "Invalid request" }, 400); }
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 1024) {
    return json({ error: "Invalid email or password" }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Authentication service unavailable" }, 503);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const emailKey = await sha256(email), since = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  try {
    const { count } = await db.from("bigfoods_staff_login_attempts").select("id", { count: "exact", head: true }).eq("email_key", emailKey).gte("attempted_at", since);
    if ((count ?? 0) >= 10) return json({ error: "Unable to sign in. Try again later." }, 429);

    const { data: staff } = await db.from("bigfoods_staff")
      .select("id,email,display_name,role,permissions,password_hash,password_salt,is_active,must_change_password,locked_until,failed_login_count")
      .eq("email", email).maybeSingle();
    const notLocked = !staff?.locked_until || new Date(staff.locked_until).getTime() <= Date.now();
    const passwordValid = staff ? await verifyPassword(password, staff.password_salt, staff.password_hash) : false;
    const ok = !!staff && staff.is_active && notLocked && passwordValid;
    await db.from("bigfoods_staff_login_attempts").insert({ email_key: emailKey, succeeded: ok });

    if (!ok) {
      if (staff && staff.is_active && !passwordValid) {
        const nextCount = staff.failed_login_count + 1;
        await db.from("bigfoods_staff").update({
          failed_login_count: nextCount,
          locked_until: nextCount >= 10 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq("id", staff.id);
      }
      return json({ error: "Invalid email or password" }, 401);
    }

    const rawToken = randomHex(32), tokenHash = await sha256(rawToken);
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const { error: sessionError } = await db.from("bigfoods_staff_sessions").insert({
      staff_id: staff.id, token_hash: tokenHash, expires_at: expiresAt,
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 500) || null,
    });
    if (sessionError) return json({ error: "Unable to create session" }, 503);
    await db.from("bigfoods_staff").update({
      failed_login_count: 0, locked_until: null, last_login_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", staff.id);
    await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: staff.id, action: "staff.login", details: { role: staff.role } });

    // Only a same-origin server route should consume this response and set an
    // HttpOnly, Secure, SameSite=Strict cookie. Never store this token in browser storage.
    return json({ session_token: rawToken, expires_at: expiresAt, staff: {
      id: staff.id, email: staff.email, display_name: staff.display_name, role: staff.role,
      permissions: staff.permissions, must_change_password: staff.must_change_password,
    } });
  } catch { return json({ error: "Authentication service unavailable" }, 503); }
});
