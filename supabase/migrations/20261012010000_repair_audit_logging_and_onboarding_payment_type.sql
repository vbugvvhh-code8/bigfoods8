create or replace function public.log_admin_action(
  p_action text, p_target_table text, p_target_id text, p_details jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not authorized'; end if;
  insert into audit_log (admin_id, action, target_table, target_id, details)
  values (auth.uid(), p_action, p_target_table, p_target_id, p_details);
end; $$;
revoke execute on function public.log_admin_action(text,text,text,jsonb) from public, anon;
grant execute on function public.log_admin_action(text,text,text,jsonb) to authenticated;

alter table public.transactions drop constraint transactions_type_check;
alter table public.transactions add constraint transactions_type_check check (type = any (array[
  'platform_fee','delivery_commission','promotion','verification_fee','payout','cancellation_penalty',
  'order_payment','rider_verification_fee','delivery_commission_transfer',
  'delivery_commission_transfer_original','delivery_tip','onboarding_plan']));
