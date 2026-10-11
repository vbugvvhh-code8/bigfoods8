create or replace function public.admin_set_user_flags(
  target_user_id uuid,
  p_starred boolean default null,
  p_blocked boolean default null,
  p_block_reason text default null
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception 'not authorized'; end if;
  update profiles set
    starred = coalesce(p_starred, starred),
    blocked = coalesce(p_blocked, blocked),
    block_reason = case when p_blocked is null then block_reason
                        when p_blocked then p_block_reason else null end
  where id = target_user_id;
end;
$$;
revoke execute on function public.admin_set_user_flags(uuid,boolean,boolean,text) from public, anon;
grant execute on function public.admin_set_user_flags(uuid,boolean,boolean,text) to authenticated;
