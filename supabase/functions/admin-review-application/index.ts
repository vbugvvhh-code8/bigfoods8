import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Authentication required" }, 401);
    const userClient = createClient(URL, ANON, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Invalid session" }, 401);
    const { data: adminFlag, error: adminError } = await userClient.rpc("is_admin");
    if (adminError || adminFlag !== true) return json({ error: "Administrator access required" }, 403);

    const body = await req.json();
    const entityType = body?.entity_type;
    const id = body?.id;
    const decision = body?.decision;
    if (!["rider", "restaurant"].includes(entityType)) return json({ error: "Invalid entity_type" }, 400);
    if (typeof id !== "string" || !id.trim()) return json({ error: "A valid id is required" }, 400);
    if (!["approved", "rejected"].includes(decision)) return json({ error: "Invalid decision" }, 400);

    const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
    const table = entityType === "rider" ? "riders" : "restaurants";
    const { data: current, error: readError } = await admin.from(table).select("id, approval_status").eq("id", id).maybeSingle();
    if (readError) {
      console.error("ADMIN_REVIEW_READ_FAILED", readError.message);
      return json({ error: "Could not load this application" }, 500);
    }
    if (!current) return json({ error: "Application not found" }, 404);

    const patch: Record<string, unknown> = { approval_status: decision };
    if (entityType === "rider" && decision === "approved") patch.strikes = 0;
    const { error: updateError } = await admin.from(table).update(patch).eq("id", id);
    if (updateError) {
      console.error("ADMIN_REVIEW_UPDATE_FAILED", { table, id, message: updateError.message });
      return json({ error: "Could not save the review decision" }, 500);
    }
    const { error: auditError } = await userClient.rpc("log_admin_action", {
      p_action: decision === "approved" ? entityType + "_approved" : entityType + "_rejected",
      p_target_table: table,
      p_target_id: id,
      p_details: { previous_status: current.approval_status ?? null, decision },
    });
    if (auditError) console.error("ADMIN_REVIEW_AUDIT_FAILED", auditError.message);
    return json({ success: true, entity_type: entityType, id, decision });
  } catch (error) {
    console.error("ADMIN_REVIEW_UNEXPECTED_ERROR", error instanceof Error ? error.message : String(error));
    return json({ error: "Unable to process this review right now" }, 500);
  }
});