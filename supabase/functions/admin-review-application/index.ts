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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Not authenticated" }, 401);

    const { data: isAdmin, error: adminError } = await userClient.rpc("is_admin");
    if (adminError || !isAdmin) return json({ error: "Forbidden - admin access required" }, 403);

    const body = await req.json();
    const entityType = body?.entity_type;
    const id = body?.id;
    const decision = body?.decision;
    if (!["restaurant", "rider"].includes(entityType)) return json({ error: "entity_type must be restaurant or rider" }, 400);
    if (typeof id !== "string" || !id) return json({ error: "id is required" }, 400);
    if (!["approved", "rejected"].includes(decision)) return json({ error: "decision must be approved or rejected" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const table = entityType === "rider" ? "riders" : "restaurants";
    const { data: entity, error: readError } = await admin.from(table).select("id, approval_status").eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!entity) return json({ error: `${entityType} not found` }, 404);

    const { error: updateError } = await admin.from(table).update({ approval_status: decision }).eq("id", id);
    if (updateError) throw updateError;

    const { error: auditError } = await userClient.rpc("log_admin_action", {
      p_action: decision === "approved" ? `${entityType}_approved` : `${entityType}_rejected`,
      p_target_table: table,
      p_target_id: id,
      p_details: { previous_status: entity.approval_status ?? null, decision },
    });
    if (auditError) console.error("ADMIN_AUDIT_LOG_FAILED", auditError.message);

    return json({ success: true, entity_type: entityType, id, decision });
  } catch (error) {
    console.error("ADMIN_REVIEW_APPLICATION_FAILED", error);
    return json({ error: "Unable to process this review right now." }, 500);
  }
});
