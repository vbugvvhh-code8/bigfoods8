-- Keep the dispatch scheduler secret in Supabase Vault rather than in cron.job.command.
-- The secret is generated inside PostgreSQL and is never returned in query results.
DO $rotation$
DECLARE
  rotated_secret text := encode(extensions.gen_random_bytes(32), 'hex');
  existing_secret_id uuid;
BEGIN
  SELECT id
    INTO existing_secret_id
    FROM vault.secrets
   WHERE name = 'bigfoods_dispatch_cron_secret'
   ORDER BY created_at DESC
   LIMIT 1;

  IF existing_secret_id IS NULL THEN
    PERFORM vault.create_secret(
      rotated_secret,
      'bigfoods_dispatch_cron_secret',
      'Dispatch-retry scheduler authentication; generated during service-area enforcement rollout',
      NULL::uuid
    );
  ELSE
    PERFORM vault.update_secret(
      existing_secret_id,
      rotated_secret,
      'bigfoods_dispatch_cron_secret',
      'Dispatch-retry scheduler authentication; rotated during service-area enforcement rollout',
      NULL::uuid
    );
  END IF;
END
$rotation$;

-- The RPC returns only a boolean. It never exposes the Vault value.
CREATE OR REPLACE FUNCTION public.verify_dispatch_cron_secret(p_presented_secret text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $verify$
  SELECT EXISTS (
    SELECT 1
      FROM vault.decrypted_secrets AS stored
     WHERE stored.name = 'bigfoods_dispatch_cron_secret'
       AND stored.decrypted_secret = p_presented_secret
  );
$verify$;

REVOKE ALL ON FUNCTION public.verify_dispatch_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_dispatch_cron_secret(text) TO service_role;
