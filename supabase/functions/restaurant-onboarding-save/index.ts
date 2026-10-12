import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fields an onboarding seller may set on their own restaurant row.
// approval_status, is_featured, rating are deliberately excluded — those stay
// admin/payment-controlled. is_accepting_orders + accepting hours are handled
// by a separate function since that's a dashboard-only operational toggle.
const ALLOWED_FIELDS = [
  "name",
  "category",
  "image_url",
  "address",
  "latitude",
  "longitude",
  "zone",
  "delivery_radius_km",
  "vendor_type",
  "registration_status",
];

const GENDERS = ["female", "male", "prefer_not_to_say"];
const VENDOR_TYPES = ["restaurant", "home_kitchen"];
const REGISTRATION_STATUSES = ["registered", "unregistered"];
// CAC numbers look like RC1234567 (company), BN1234567 (business name) or
// IT12345 (incorporated trustees). Digits only is also accepted.
const CAC_PATTERN = /^(RC|BN|IT)?\s?-?\d{4,9}$/i;
const MIN_AGE_YEARS = 18;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Whole years between a YYYY-MM-DD date of birth and today (UTC). */
function ageInYears(dob: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const birth = new Date(Date.UTC(y, mo - 1, d));
  if (birth.getUTCFullYear() !== y || birth.getUTCMonth() !== mo - 1 || birth.getUTCDate() !== d) return null;
  let age = now.getUTCFullYear() - y;
  const hadBirthday =
    now.getUTCMonth() > mo - 1 || (now.getUTCMonth() === mo - 1 && now.getUTCDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) patch[key] = body[key];
    }

    if ("vendor_type" in patch && !VENDOR_TYPES.includes(patch.vendor_type as string)) {
      return json({ error: "Choose restaurant or home kitchen" }, 400);
    }
    if ("registration_status" in patch && !REGISTRATION_STATUSES.includes(patch.registration_status as string)) {
      return json({ error: "Choose whether your business is registered" }, 400);
    }
    // Registered businesses must give a CAC number (an admin verifies it
    // later); the number lives in the private owner-details table.
    let cacNumber: string | null = null;
    if (patch.registration_status === "registered") {
      const raw = typeof body.cac_number === "string" ? body.cac_number.trim() : "";
      if (!CAC_PATTERN.test(raw)) {
        return json({ error: "Enter your CAC registration number (for example RC1234567 or BN1234567)" }, 400);
      }
      cacNumber = raw.toUpperCase().replace(/[\s-]/g, "");
    }

    // Private owner details (age gate, gender, acknowledgements). Validated on
    // the server so the 18+ rule can't be skipped by editing the browser.
    let ownerDetails: {
      date_of_birth: string;
      gender: string;
      terms_accepted_at: string;
      serious_business_ack_at: string;
      warnings_ack_at: string;
    } | null = null;

    if (body.ownerDetails) {
      const o = body.ownerDetails;
      const age = typeof o.date_of_birth === "string" ? ageInYears(o.date_of_birth) : null;
      if (age === null || age > 110) return json({ error: "Enter a valid date of birth" }, 400);
      if (age < MIN_AGE_YEARS) {
        return json({ error: "You must be 18 or older to sell on BigFoods" }, 400);
      }
      if (!GENDERS.includes(o.gender)) return json({ error: "Choose a gender option" }, 400);
      if (!o.terms_accepted || !o.serious_business_ack || !o.warnings_ack) {
        return json({ error: "Please accept the terms, the serious-business pledge and the warnings" }, 400);
      }
      const nowIso = new Date().toISOString();
      ownerDetails = {
        date_of_birth: o.date_of_birth,
        gender: o.gender,
        terms_accepted_at: nowIso,
        serious_business_ack_at: nowIso,
        warnings_ack_at: nowIso,
      };
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: existing } = await admin
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await admin
        .from("restaurants")
        .update(patch)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      if (!patch.name) {
        return json({ error: "Restaurant name is required to create the record" }, 400);
      }
      const { data, error } = await admin
        .from("restaurants")
        .insert({ ...patch, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    if (ownerDetails) {
      const { error: detailsError } = await admin
        .from("restaurant_owner_details")
        .upsert({ restaurant_id: result.id, ...ownerDetails }, { onConflict: "restaurant_id" });
      if (detailsError) throw detailsError;
    }

    // Keep the private CAC number in step with the registration choice.
    // Any change resets admin verification, so a number can't be swapped
    // after it was checked.
    if ("registration_status" in patch) {
      if (patch.registration_status === "registered" && cacNumber) {
        const { data: current } = await admin
          .from("restaurant_owner_details")
          .select("cac_number")
          .eq("restaurant_id", result.id)
          .maybeSingle();
        if (current && current.cac_number !== cacNumber) {
          const { error: cacError } = await admin
            .from("restaurant_owner_details")
            .update({ cac_number: cacNumber, registration_verified_at: null, registration_verified_by: null })
            .eq("restaurant_id", result.id);
          if (cacError) throw cacError;
        }
      } else if (patch.registration_status === "unregistered") {
        await admin
          .from("restaurant_owner_details")
          .update({ cac_number: null, registration_verified_at: null, registration_verified_by: null })
          .eq("restaurant_id", result.id);
      }
    }

    return json({ success: true, restaurant: result });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
