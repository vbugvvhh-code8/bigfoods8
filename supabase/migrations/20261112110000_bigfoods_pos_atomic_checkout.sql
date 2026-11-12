-- Atomic POS checkout. Prices are always re-read from the independent POS catalogue.
alter table public.bigfoods_pos_payments drop constraint if exists bigfoods_pos_payments_payment_method_check;
alter table public.bigfoods_pos_payments add constraint bigfoods_pos_payments_payment_method_check
  check (payment_method in ('cash','moniepoint_pos','bank_transfer'));

create or replace function public.bigfoods_pos_checkout(
  p_session_id uuid,
  p_cashier_staff_id uuid,
  p_idempotency_key uuid,
  p_payment_method text,
  p_items jsonb,
  p_cash_received numeric default null,
  p_payment_reference text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.bigfoods_pos_table_sessions%rowtype;
  v_item jsonb;
  v_product public.bigfoods_pos_items%rowtype;
  v_quantity integer;
  v_subtotal numeric(14,2) := 0;
  v_total numeric(14,2);
  v_change numeric(14,2) := 0;
  v_sale_id uuid;
  v_receipt text;
  v_existing public.bigfoods_pos_sales%rowtype;
  v_payment_method text;
begin
  if p_payment_method not in ('cash','moniepoint_pos','bank_transfer') then
    raise exception 'Unsupported payment method';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'Add between 1 and 100 basket lines';
  end if;
  select * into v_existing from public.bigfoods_pos_sales where idempotency_key=p_idempotency_key;
  if found then
    return jsonb_build_object('sale_id',v_existing.id,'receipt_number',v_existing.receipt_number,'total_amount',v_existing.total_amount,'status',v_existing.status,'replayed',true);
  end if;
  select * into v_session from public.bigfoods_pos_table_sessions where id=p_session_id for update;
  if not found or v_session.status <> 'open' then raise exception 'Service session is not open'; end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 99 then raise exception 'Invalid item quantity'; end if;
    select * into v_product from public.bigfoods_pos_items where id=(v_item->>'product_id')::uuid and is_available=true;
    if not found then raise exception 'A basket product is unavailable'; end if;
    v_subtotal := v_subtotal + (v_product.selling_price * v_quantity);
  end loop;
  v_total := v_subtotal;
  if p_payment_method='cash' then
    if p_cash_received is null or p_cash_received < v_total then raise exception 'Cash received must cover the total'; end if;
    v_change := p_cash_received-v_total;
    v_payment_method := 'cash';
  elsif p_payment_method='moniepoint_pos' then
    v_payment_method := 'card';
  else
    v_payment_method := 'transfer';
  end if;

  v_receipt := 'BF-' || to_char(now(),'YYMMDDHH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.bigfoods_pos_sales(receipt_number,idempotency_key,cashier_staff_id,payment_method,status,subtotal,total_amount,cash_received,change_due,payment_note)
  values(v_receipt,p_idempotency_key,p_cashier_staff_id,v_payment_method,'paid',v_subtotal,v_total,
    case when p_payment_method='cash' then p_cash_received else null end,v_change,p_payment_reference)
  returning id into v_sale_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_product from public.bigfoods_pos_items where id=(v_item->>'product_id')::uuid and is_available=true;
    v_quantity := (v_item->>'quantity')::integer;
    insert into public.bigfoods_pos_sale_items(sale_id,product_id,product_name,quantity,unit_price,line_total)
    values(v_sale_id,v_product.id,v_product.name,v_quantity,v_product.selling_price,v_product.selling_price*v_quantity);
  end loop;
  insert into public.bigfoods_pos_payments(sale_id,payment_method,amount,status,reference,confirmed_by_staff_id,confirmed_at)
  values(v_sale_id,p_payment_method,v_total,'confirmed',nullif(trim(p_payment_reference),''),p_cashier_staff_id,now());
  update public.bigfoods_pos_table_sessions set status='paid',closed_by_staff_id=p_cashier_staff_id,closed_at=now() where id=p_session_id;
  if v_session.table_id is not null then
    update public.bigfoods_pos_tables set status='available',updated_at=now() where id=v_session.table_id;
  end if;
  return jsonb_build_object('sale_id',v_sale_id,'receipt_number',v_receipt,'subtotal',v_subtotal,'total_amount',v_total,'cash_received',p_cash_received,'change_due',v_change,'status','paid','replayed',false);
end;
$$;
revoke all on function public.bigfoods_pos_checkout(uuid,uuid,uuid,text,jsonb,numeric,text) from public, anon, authenticated;
grant execute on function public.bigfoods_pos_checkout(uuid,uuid,uuid,text,jsonb,numeric,text) to service_role;
