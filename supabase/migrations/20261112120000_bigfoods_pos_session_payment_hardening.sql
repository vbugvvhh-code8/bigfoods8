-- Hardened POS session opening and payment confirmation.
-- Uses the existing staff attendance/shift system; no POS-specific shifts are created.

alter table public.bigfoods_pos_sales
  add column if not exists session_id uuid references public.bigfoods_pos_table_sessions(id) on delete restrict;
create index if not exists bigfoods_pos_sales_session_idx on public.bigfoods_pos_sales(session_id);

create or replace function public.bigfoods_pos_open_session(
  p_actor_staff_id uuid,
  p_service_type text,
  p_table_id uuid default null,
  p_guest_count integer default 1,
  p_customer_name text default null,
  p_notes text default null
) returns public.bigfoods_pos_table_sessions
language plpgsql security definer set search_path=public
as $$
declare
  v_table public.bigfoods_pos_tables%rowtype;
  v_session public.bigfoods_pos_table_sessions%rowtype;
  v_number text;
begin
  if p_service_type not in ('dine_in','takeaway','counter') then
    raise exception 'Choose dine-in, takeaway or counter service';
  end if;
  if p_guest_count is null or p_guest_count < 1 or p_guest_count > 50 then
    raise exception 'Guest count must be between 1 and 50';
  end if;
  if p_service_type='dine_in' then
    select * into v_table from public.bigfoods_pos_tables where id=p_table_id for update;
    if not found or not v_table.is_active or v_table.status<>'available' then
      raise exception 'That table is no longer available';
    end if;
  elsif p_table_id is not null then
    raise exception 'Only dine-in sessions can use a table';
  end if;
  v_number := 'S-' || to_char(clock_timestamp(),'YYMMDDHH24MISSMS') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.bigfoods_pos_table_sessions(session_number,service_type,table_id,guest_count,customer_name,opened_by_staff_id,notes)
  values(v_number,p_service_type,p_table_id,p_guest_count,nullif(trim(p_customer_name),''),p_actor_staff_id,nullif(trim(p_notes),'')) returning * into v_session;
  if p_service_type='dine_in' then
    update public.bigfoods_pos_tables set status='occupied',updated_at=now() where id=p_table_id;
  end if;
  return v_session;
end;
$$;
revoke all on function public.bigfoods_pos_open_session(uuid,text,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.bigfoods_pos_open_session(uuid,text,uuid,integer,text,text) to service_role;

create or replace function public.bigfoods_pos_confirm_payment(
  p_payment_id uuid,
  p_actor_staff_id uuid,
  p_reference text default null
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_payment public.bigfoods_pos_payments%rowtype;
  v_sale public.bigfoods_pos_sales%rowtype;
  v_session public.bigfoods_pos_table_sessions%rowtype;
begin
  select * into v_payment from public.bigfoods_pos_payments where id=p_payment_id for update;
  if not found then raise exception 'Payment record not found'; end if;
  if v_payment.status='confirmed' then
    return jsonb_build_object('payment_id',v_payment.id,'sale_id',v_payment.sale_id,'status','confirmed','replayed',true);
  end if;
  if v_payment.status<>'pending' or v_payment.payment_method='cash' then
    raise exception 'Only pending external payments can be confirmed';
  end if;
  if nullif(trim(coalesce(p_reference,v_payment.reference,'')),'') is null then
    raise exception 'Enter the verified terminal or transfer reference';
  end if;
  select * into v_sale from public.bigfoods_pos_sales where id=v_payment.sale_id for update;
  if not found or v_sale.status<>'needs_review' or v_sale.session_id is null then
    raise exception 'Sale is not awaiting payment verification';
  end if;
  select * into v_session from public.bigfoods_pos_table_sessions where id=v_sale.session_id for update;
  if not found or v_session.status<>'awaiting_payment' then
    raise exception 'Service session is not awaiting payment';
  end if;
  update public.bigfoods_pos_payments set status='confirmed',reference=trim(coalesce(p_reference,reference)),confirmed_by_staff_id=p_actor_staff_id,confirmed_at=now()
    where id=v_payment.id;
  update public.bigfoods_pos_sales set status='paid',payment_note=trim(coalesce(p_reference,payment_note)) where id=v_sale.id;
  update public.bigfoods_pos_table_sessions set status='paid',closed_by_staff_id=p_actor_staff_id,closed_at=now() where id=v_session.id;
  if v_session.table_id is not null then
    update public.bigfoods_pos_tables set status='available',updated_at=now() where id=v_session.table_id;
  end if;
  return jsonb_build_object('payment_id',v_payment.id,'sale_id',v_sale.id,'receipt_number',v_sale.receipt_number,'status','paid','replayed',false);
end;
$$;
revoke all on function public.bigfoods_pos_confirm_payment(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.bigfoods_pos_confirm_payment(uuid,uuid,text) to service_role;
