/*
# Fix Admin Auth: Missing Instance and Identity Rows

## Problem
The admin user `admin@bigfoods.online` (id: 165c5446-bded-46b0-aa98-686236324513)
was created via direct SQL INSERT into `auth.users`, bypassing the Supabase Auth API.

This caused two critical issues:
1. `auth.instances` table has 0 rows — GoTrue requires at least one instance
   to function. Without it, all auth API calls (signIn, createUser, deleteUser)
   fail with "Database error querying schema" / "Database error loading user".
2. `auth.identities` table has 0 rows for this user — when signInWithPassword
   is called, GoTrue looks up the identity and throws a 500 when none is found.

## Fix
1. Insert a default row into `auth.instances` (id: all-zeros UUID, matching
   the instance_id already set on the user).
2. Insert the missing `auth.identities` row for the admin user with the correct
   shape (provider='email', identity_data containing sub/email/email_verified).
   The `email` column is generated as `lower(identity_data->>'email')`, so it
   is omitted from the INSERT.
3. Re-set the password hash to ensure it matches the expected password.
4. Ensure the profiles row has role='admin' and status='active'.

## Important Notes
1. This is a one-time fix for a user incorrectly created via raw SQL.
2. Future users must be created via the Supabase Auth API (signUp or admin.createUser),
   which automatically creates the identity row and does not require manual instance setup.
3. ON CONFLICT DO NOTHING makes this safe to re-run.
*/

-- Step 1: Insert the missing auth.instances row
INSERT INTO auth.instances (id, uuid, raw_base_config, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Step 2: Insert the missing auth.identities row for the admin user
-- email column is generated (lower(identity_data->>'email')), omitted from INSERT
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  '165c5446-bded-46b0-aa98-686236324513',
  '165c5446-bded-46b0-aa98-686236324513',
  jsonb_build_object(
    'sub', '165c5446-bded-46b0-aa98-686236324513',
    'email', 'admin@bigfoods.online',
    'email_verified', true
  ),
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT DO NOTHING;

-- Step 3: Re-set the password hash to ensure it matches
UPDATE auth.users
SET encrypted_password = crypt('BigFoods2026!', gen_salt('bf'))
WHERE id = '165c5446-bded-46b0-aa98-686236324513';

-- Step 4: Ensure the profiles row has admin role
UPDATE public.profiles
SET role = 'admin', status = 'active', full_name = 'BigFoods Admin'
WHERE id = '165c5446-bded-46b0-aa98-686236324513';
