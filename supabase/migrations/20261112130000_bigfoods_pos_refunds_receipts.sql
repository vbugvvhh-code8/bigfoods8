-- Auditable POS refunds, tender reversals and receipt history.
-- Stock restoration is intentionally deferred until inventory transactions are verified.

create table if not exists public.bigfoods_pos_refunds (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.bigfoods_pos_sales(id) on delete restrict,
  refund_number text not null unique,
  amount numeric(14,2) not null check (amount > 0),
  refund_method text not null check (refund_method in ('cash','moniepoint_pos','bank_transfer')),
  reason text not null check (length(trim(reason)) between 3 and 500),
  reference text,
  status text not null default 'completed' check (status in ('completed','reversed')),
  processed_by_staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  created_at timestamptz not null default now(),
  reversed_by_staff_id uuid references public.bigfoods_staff(id) on delete restrict,
  reversed_at timestamptz,
  reversal_reason text,
  constraint bigfoods_pos_refund_reversal_fields check (
    (status='completed' and reversed_at is null and reversed_by_staff_id is null)
    or (status='reversed' and reversed_at is not null and reversed_by_staff_id is not null and length(trim(coalesce(reversal_reason,'')))>=3)
  )
);
create index if not exists bigfoods_pos_refunds_sale_idx on public.bigfoods_pos_refunds(sale_id,created_at desc);

create table if not exists public.bigfoods_pos_payment_reversals (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.bigfoods_pos_payments(id) on delete restrict,
  sale_id uuid not null references public.bigfoods_pos_sales(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  reason text not null check (length(trim(reason)) between 3 and 500),
  reference text,
  processed_by_staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(payment_id)
);
create index if not exists bigfoods_pos_payment_reversals_sale_idx on public.bigfoods_pos_payment_reversals(sale_id,created_at desc);

create table if not exists public.bigfoods_pos_sale_audit_events (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.bigfoods_pos_sales(id) on delete restrict,
  actor_staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  action text not null check (action in ('refund_created','refund_reversed','payment_reversed')),
  amount numeric(14,2) not null check (amount > 0),
  reason text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bigfoods_pos_sale_audit_events_sale_idx on public.bigfoods_pos_sale_audit_events(sale_id,created_at desc);

alter table public.bigfoods_pos_refunds enable row level security;
alter table public.bigfoods_pos_payment_reversals enable row level security;
alter table public.bigfoods_pos_sale_audit_events enable row level security;

-- Add a partial-refund state without rewriting historical sales.
do $$
declare c record;
begin
  for c in select conname from pg_constraint
    where conrelid='public.bigfoods_pos_sales'::regclass and contype='c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop execute format('alter table public.bigfoods_pos_sales drop constraint %I',c.conname); end loop;
end $$;
alter table public.bigfoods_pos_sales add constraint bigfoods_pos_sales_status_check
  check (status in ('paid','needs_review','voided','refunded','partially_refunded')) not valid;

create or replace function public.bigfoods_pos_create_refund(
  p_sale_id uuid,
  p_actor_staff_id uuid,
  p_amount numeric,
  p_refund_method text,
  p_reason text,
  p_reference text default null
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_sale public.bigfoods_pos_sales%rowtype;
  v_refunded numeric(14,2);
  v_refund_id uuid;
  v_number text;
begin
  if p_amount is null or p_amount<=0 then raise exception 'Refund amount must be greater than zero'; end if;
  if p_refund_method not in ('cash','moniepoint_pos','bank_transfer') then raise exception 'Choose a valid refund method'; end if;
  if length(trim(coalesce(p_reason,'')))<3 or length(trim(p_reason))>500 then raise exception 'Enter a refund reason (3 to 500 characters)'; end if;
  select * into v_sale from public.bigfoods_pos_sales where id=p_sale_id for update;
  if not found or v_sale.status not in ('paid','partially_refunded') then raise exception 'Only paid sales can be refunded'; end if;
  select coalesce(sum(amount),0) into v_refunded from public.bigfoods_pos_refunds where sale_id=p_sale_id and status='completed';
  if p_amount > v_sale.total_amount-v_refunded then raise exception 'Refund exceeds the remaining refundable balance'; end if;
  v_number := 'R-'||to_char(clock_timestamp(),'YYMMDDHH24MISSMS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.bigfoods_pos_refunds(sale_id,refund_number,amount,refund_method,reason,reference,processed_by_staff_id)
  values(p_sale_id,v_number,p_amount,p_refund_method,trim(p_reason),nullif(trim(p_reference),''),p_actor_staff_id)
  returning id into v_refund_id;
  select coalesce(sum(amount),0) into v_refunded from public.bigfoods_pos_refunds where sale_id=p_sale_id and status='completed';
  update public.bigfoods_pos_sales set status=case when v_refunded>=total_amount then 'refunded' else 'partially_refunded' end where id=p_sale_id;
  insert into public.bigfoods_pos_sale_audit_events(sale_id,actor_staff_id,action,amount,reason,details)
  values(p_sale_id,p_actor_staff_id,'refund_created',p_amount,trim(p_reason),jsonb_build_object('refund_id',v_refund_id,'refund_number',v_number,'method',p_refund_method,'reference',p_reference,'remaining_balance',v_sale.total_amount-v_refunded,'stock_restoration','not_applicable_inventory_deduction_deferred'));
  return jsonb_build_object('refund_id',v_refund_id,'refund_number',v_number,'sale_id',p_sale_id,'amount',p_amount,'status','completed','remaining_balance',v_sale.total_amount-v_refunded);
end;
$$;
revoke all on function public.bigfoods_pos_create_refund(uuid,uuid,numeric,text,text,text) from public,anon,authenticated;
grant execute on function public.bigfoods_pos_create_refund(uuid,uuid,numeric,text,text,text) to service_role;

create or replace function public.bigfoods_pos_reverse_refund(
  p_refund_id uuid,p_actor_staff_id uuid,p_reason text
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v_refund public.bigfoods_pos_refunds%rowtype; v_sale public.bigfoods_pos_sales%rowtype; v_refunded numeric(14,2);
begin
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Enter a reversal reason'; end if;
  select * into v_refund from public.bigfoods_pos_refunds where id=p_refund_id for update;
  if not found or v_refund.status<>'completed' then raise exception 'Refund is not eligible for reversal'; end if;
  select * into v_sale from public.bigfoods_pos_sales where id=v_refund.sale_id for update;
  update public.bigfoods_pos_refunds set status='reversed',reversed_by_staff_id=p_actor_staff_id,reversed_at=now(),reversal_reason=trim(p_reason) where id=p_refund_id;
  select coalesce(sum(amount),0) into v_refunded from public.bigfoods_pos_refunds where sale_id=v_refund.sale_id and status='completed';
  update public.bigfoods_pos_sales set status=case when v_refunded=0 then 'paid' else 'partially_refunded' end where id=v_refund.sale_id;
  insert into public.bigfoods_pos_sale_audit_events(sale_id,actor_staff_id,action,amount,reason,details)
  values(v_refund.sale_id,p_actor_staff_id,'refund_reversed',v_refund.amount,trim(p_reason),jsonb_build_object('refund_id',p_refund_id));
  return jsonb_build_object('refund_id',p_refund_id,'sale_id',v_refund.sale_id,'status','reversed','refundable_balance',v_sale.total_amount-v_refunded);
end;
$$;
revoke all on function public.bigfoods_pos_reverse_refund(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.bigfoods_pos_reverse_refund(uuid,uuid,text) to service_role;

create or replace function public.bigfoods_pos_reverse_payment(
  p_payment_id uuid,p_actor_staff_id uuid,p_reason text,p_reference text default null
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v_payment public.bigfoods_pos_payments%rowtype; v_sale public.bigfoods_pos_sales%rowtype; v_session public.bigfoods_pos_table_sessions%rowtype;
begin
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Enter a reversal reason'; end if;
  select * into v_payment from public.bigfoods_pos_payments where id=p_payment_id for update;
  if not found or v_payment.status not in ('pending','confirmed') then raise exception 'Payment is not eligible for reversal'; end if;
  if exists(select 1 from public.bigfoods_pos_payment_reversals where payment_id=p_payment_id) then raise exception 'Payment already has a reversal record'; end if;
  select * into v_sale from public.bigfoods_pos_sales where id=v_payment.sale_id for update;
  if not found or v_sale.status not in ('paid','needs_review') then raise exception 'Sale cannot be reversed in its current state'; end if;
  if exists(select 1 from public.bigfoods_pos_refunds where sale_id=v_sale.id and status='completed') then raise exception 'Reverse or resolve existing refunds before reversing this payment'; end if;
  insert into public.bigfoods_pos_payment_reversals(payment_id,sale_id,amount,reason,reference,processed_by_staff_id)
  values(p_payment_id,v_sale.id,v_payment.amount,trim(p_reason),nullif(trim(p_reference),''),p_actor_staff_id);
  update public.bigfoods_pos_payments set status='reversed',notes=concat_ws(E'\n',notes,'Reversed: '||trim(p_reason)) where id=p_payment_id;
  update public.bigfoods_pos_sales set status='voided' where id=v_sale.id;
  if v_sale.session_id is not null then
    select * into v_session from public.bigfoods_pos_table_sessions where id=v_sale.session_id for update;
    if found and v_session.status='awaiting_payment' then
      update public.bigfoods_pos_table_sessions set status='cancelled',closed_by_staff_id=p_actor_staff_id,closed_at=now() where id=v_session.id;
      if v_session.table_id is not null then update public.bigfoods_pos_tables set status='available',updated_at=now() where id=v_session.table_id; end if;
    end if;
  end if;
  insert into public.bigfoods_pos_sale_audit_events(sale_id,actor_staff_id,action,amount,reason,details)
  values(v_sale.id,p_actor_staff_id,'payment_reversed',v_payment.amount,trim(p_reason),jsonb_build_object('payment_id',p_payment_id,'reference',p_reference));
  return jsonb_build_object('payment_id',p_payment_id,'sale_id',v_sale.id,'status','reversed','amount',v_payment.amount);
end;
$$;
revoke all on function public.bigfoods_pos_reverse_payment(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.bigfoods_pos_reverse_payment(uuid,uuid,text,text) to service_role;

-- Receipt query is intentionally read-only and returns the immutable sold line snapshots.\n-- Refunds/reversals never mutate inventory: POS sale-to-stock deduction is deferred.\n-- Once inventory deduction is implemented, refunds must restore only the exact deducted recipe quantities,\n-- keyed by refund_id for idempotency, and refund reversals must compensate that restoration exactly once.
