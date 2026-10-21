import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { isCanonicalActiveZone } from "../_shared/service-area.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fields an onboarding rider may set on their own row.
// approval_status, status, strikes, verification_fee_paid are deliberately
// excluded -- admin/payment-controlled. waiver_* fields are also excluded --
// the waiver is completed post-login via rider-complete-waiver, not part of
// the 5-step onboarding.
const ALLOWED_FIELDS = [
  "name",
  "phone",
  "email",
  "vehicle_type",
  "plate_number",
  "company_name",
  "face_photo_url",
  "id_front_url",
  "id_back_url",
  "id_number",
  "lat",
  "lng",
  "zone",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) patch[key] = body[key];
    }

    // Validate the requested zone against the admin-controlled coverage list.
    // Duplicate LGA names use the same "LGA (State)" key as the app.
    if ("zone" in patch) {
      if (typeof patch.zone !== "string" || !patch.zone.trim()) {
        return new Response(JSON.stringify({ error: "Select a valid service area" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { data: locations, error: locationsError } = await admin
        .from("locations")
        .select("state, lga, is_active");
      if (locationsError) {
        return new Response(JSON.stringify({ error: "Unable to verify service area" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!isCanonicalActiveZone(patch.zone, locations ?? [])) {
        return new Response(JSON.stringify({ error: "That service area is not currently active" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if ("lat" in patch || "lng" in patch) {
      patch.last_location_update = new Date().toISOString();
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: existing } = await admin
      .from("riders")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await admin
        .from("riders")
        .update(patch)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      if (!patch.name) {
        return new Response(
          JSON.stringify({ error: "Rider name is required to create the record" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data, error } = await admin
        .from("riders")
        .insert({ ...patch, profile_id: user.id, email: patch.email ?? user.email })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return new Response(JSON.stringify({ success: true, rider: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
