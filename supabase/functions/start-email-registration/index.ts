import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ROLE_BY_PURPOSE: Record<string, string> = {
  customer_signup: "customer",
  restaurant_signup: "restaurant",
  rider_signup: "rider",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const purpose = String(body.purpose ?? "");
    const role = ROLE_BY_PURPOSE[purpose];

    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (!fullName || !phone) return json({ error: "Full name and phone number are required." }, 400);
    if (!role) return json({ error: "Invalid registration type." }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Never issue a login link for an existing account: that could grant access
    // to an account the registrant does not own.
    const { data: existingId, error: lookupError } = await supabase.rpc(
      "auth_user_id_by_email", { p_email: email },
    );
    if (lookupError) return json({ error: "Could not check this email. Please try again." }, 500);
    if (existingId) return json({ error: "An account already exists for this email. Please log in instead." }, 409);

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        email_verified: false,
        email_verification_status: "pending",
      },
    });
    if (createError || !created.user) {
      return json({ error: "Could not create this account. Check the details and try again." }, 400);
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: created.user.id,
      role,
      full_name: fullName,
      phone,
      status: "active",
      email_verified: false,
    });
    if (profileError) {
      await supabase.auth.admin.deleteUser(created.user.id);
      return json({ error: "Could not finish creating your account. Please try again." }, 500);
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink", email,
    });
    if (linkError || !linkData.properties?.hashed_token) {
      await supabase.from("profiles").delete().eq("id", created.user.id);
      await supabase.auth.admin.deleteUser(created.user.id);
      return json({ error: "Could not start your session. Please try again." }, 500);
    }

    return json({
      success: true,
      user_id: created.user.id,
      token_hash: linkData.properties.hashed_token,
      email_verified: false,
    });
  } catch {
    return json({ error: "Unexpected registration error. Please try again." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
