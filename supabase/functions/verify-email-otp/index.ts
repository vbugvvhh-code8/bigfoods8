import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Verifies a code and creates/confirms the account. Defaults purpose to
// 'restaurant_signup' when omitted. Has attempt-lockout (5 tries).
// Existing users are found with an exact lookup (auth_user_id_by_email), not by
// listing users, so this keeps working past the first page of users.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PURPOSE_TO_ROLE: Record<string, string> = {
  customer_signup: "customer",
  restaurant_signup: "restaurant",
  rider_signup: "rider",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, code, purpose, full_name, phone } = await req.json();
    const resolvedPurpose = purpose ?? "restaurant_signup";
    if (!email || !code) return json({ error: "email and code are required" }, 400);

    const role = PURPOSE_TO_ROLE[resolvedPurpose];
    if (!role) return json({ error: "Invalid purpose" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: record } = await supabase
      .from("email_verification_codes")
      .select("*")
      .eq("email", email)
      .eq("purpose", resolvedPurpose)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record) return json({ error: "No pending verification for this email" }, 400);
    if (new Date(record.expires_at) < new Date()) return json({ error: "Code has expired, request a new one" }, 400);
    if (record.attempts >= 5) return json({ error: "Too many attempts, request a new code" }, 429);

    if (record.code !== code) {
      await supabase.from("email_verification_codes").update({ attempts: record.attempts + 1 }).eq("id", record.id);
      return json({ error: "Incorrect code" }, 400);
    }

    await supabase.from("email_verification_codes").update({ verified_at: new Date().toISOString() }).eq("id", record.id);

    const { data: foundId, error: lookupError } = await supabase.rpc("auth_user_id_by_email", { p_email: email });
    if (lookupError) return json({ error: "Could not look up your account. Try again." }, 500);
    let userId: string | null = foundId ?? null;
    const isNewUser = !userId;

    if (!userId) {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name, phone },
      });
      if (createError) return json({ error: createError.message }, 500);
      userId = created.user.id;
    }

    // New accounts get a profile; an existing account that somehow has none
    // (a half-finished earlier signup) gets one too. Existing profiles are never touched.
    const { data: profileRow } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!profileRow) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({ id: userId, role, full_name, phone, status: "active" });
      if (profileError) return json({ error: "Could not finish creating your account. Try again." }, 500);
    }

    // Mark the BigFoods application profile as verified only after a valid OTP.
    const { error: verificationUpdateError } = await supabase
      .from("profiles")
      .update({ email_verified: true })
      .eq("id", userId);
    if (verificationUpdateError) {
      return json({ error: "Your code was accepted, but we could not update verification status. Please try again." }, 500);
    }
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { email_verified: true, email_verification_status: "verified" },
    });

    // token_hash pattern: frontend calls supabase.auth.verifyOtp({ email, token_hash, type: 'email' })
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
    if (linkError) return json({ error: linkError.message }, 500);

    return json({ success: true, user_id: userId, is_new_user: isNewUser, token_hash: linkData.properties?.hashed_token });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
