import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Missing authorization" }, 401);

    // Validate the actual signed-in user and confirm admin role before using
    // the service-role client for the protected update.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Not authenticated" }, 401);

    const { data: isAdmin, error: adminCheckError } = await userClient.rpc("is_admin");
    if (adminCheckError || !isAdmin) return json({ error: "Forbidden - admin access required" }, 403);

    const body = await req.json();
    const entityType = body?.entity_type;
    const id = body?.id;
    const decision = body?.decision;

    if (!["restaurant", "rider"].includes(entityType)) {
      return json({ error: "entity_type must be restaurant or rider" }, 400);
    }
    if (typeof id !== "string" || !id.trim()) return json({ error: "id is required" }, 400);
    if (!["approved", "rejected"].includes(decision)) {
      return json({ error: "decision must be approved or rejected" }, 400);
    }

    const table = entityType === "rider" ? "riders" : "restaurants";
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: entity, error: readError } = await admin
      .from(table)
      .select("id, approval_status")
      .eq("id", id)
      .maybeSingle();
    if (readError) {
      console.error("ADMIN_REVIEW_READ_FAILED", readError.message);
      return json({ error: "Could not load this application." }, 500);
    }
    if (!entity) return json({ error: `${entityType} not found` }, 404);

    const patch: Record<string, unknown> = { approval_status: decision };
    // Preserve the existing re-approval safety rule for suspended riders.
    if (entityType === "rider" && decision === "approved") patch.strikes = 0;

    // Use service role only after validating the caller's identity and admin
    // role. This avoids the UI's admin write being blocked by table RLS.
    const { data: updated, error: updateError } = await admin
      .from(table)
      .update(patch)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (updateError) {
      console.error("ADMIN_REVIEW_UPDATE_FAILED", updateError.message);
      return json({ error: "Could not save this approval decision." }, 500);
    }
    if (!updated) return json({ error: "Application was not updated." }, 409);

    // Preserve audit attribution to the current admin session. An audit-log
    // outage must not undo an otherwise successful approval.
    const { error: auditError } = await userClient.rpc("log_admin_action", {
      p_action: `application_${decision}`,
      p_target_table: table,
      p_target_id: id,
      p_details: { entity_type: entityType, previous_status: entity.approval_status ?? null, strikes_reset: patch.strikes === 0 },
    });
    if (auditError) console.error("ADMIN_REVIEW_AUDIT_FAILED", auditError.message);

    return json({ success: true, entity_type: entityType, id, decision });
  } catch (error) {
    console.error("ADMIN_REVIEW_APPLICATION_FAILED", error);
    return json({ error: "Unable to process this review right now." }, 500);
  }
});
