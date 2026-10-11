revoke execute on function public.log_admin_action(text,text,text,jsonb) from public, anon, authenticated;
revoke execute on function public.expire_promotions() from public, anon, authenticated;
revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.publish_legal_document(text,text) from public, anon;
revoke execute on function public.set_user_status(uuid,text) from public, anon;
alter function public.is_admin() set search_path = public;
alter function public.log_admin_action(text,text,text,jsonb) set search_path = public;
alter function public.publish_legal_document(text,text) set search_path = public;
alter function public.set_user_status(uuid,text) set search_path = public;
