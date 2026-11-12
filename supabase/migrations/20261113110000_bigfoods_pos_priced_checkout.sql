create or replace function public.bigfoods_pos_checkout_priced(
  p_session_id uuid,
  p_cashier_staff_id uuid,
  p_idempotency_key uuid,
  p_payment_method text,
  p_items jsonb,
  p_cash_received numeric default null,
  p_payment_reference text default null,
  p_discount_amount numeric default 0,
  p_customer_email text default null,
  p_actor_role text default 'cashier'
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_settings public.bigfoods_pos_settings%rowtype;
  v_result jsonb;
  v_sale_id uuid;
  v_subtotal numeric(14,2);
  v_discount numeric(14,2);
  v_tax numeric(14,2);
  v_total numeric(14,2);
  v_cash numeric(14,2);
begin
  select * into v_settings from public.bigfoods_pos_settings where id=true;
  if not found then raise exception 'POS pricing settings are unavailable'; end if;
  v_discount := greatest(0, coalesce(p_discount_amount,0));
  if v_discount > 0 then
    if not v_settings.discount_enabled then raise exception 'Discounts are currently disabled'; end if;
    if not (lower(coalesce(p_actor_role,'')) = any(select lower(x) from unnest(v_settings.discount_allowed_roles) x)) then
      raise exception 'Your staff role is not allowed to apply discounts';
    end if;
  end if;
  if p_customer_email is not null and (length(trim(p_customer_email)) > 254 or trim(p_customer_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$') then
    raise exception 'Enter a valid customer email address';
  end if;
  select sum(i.selling_price * (x->>'quantity')::integer)
    into v_subtotal
    from jsonb_array_elements(p_items) x
    join public.bigfoods_pos_items i on i.id=(x->>'product_id')::uuid and i.is_available=true;
  if v_subtotal is null then raise exception 'Unable to calculate basket subtotal'; end if;
  if v_discount > v_subtotal then raise exception 'Discount cannot exceed the subtotal'; end if;
  if v_subtotal > 0 and v_discount / v_subtotal * 100 > v_settings.discount_max_percent then
    raise exception 'Discount exceeds the maximum allowed percentage';
  end if;
  v_tax := case when v_settings.tax_enabled then round(((v_subtotal-v_discount)*v_settings.tax_rate/100),2) else 0 end;
  v_total := v_subtotal-v_discount+v_tax;
  if p_payment_method='cash' then
    if p_cash_received is null or p_cash_received < v_total then raise exception 'Cash received must cover the final total'; end if;
    v_cash := greatest(p_cash_received,v_subtotal);
  else
    v_cash := null;
  end if;
  v_result := public.bigfoods_pos_checkout(p_session_id,p_cashier_staff_id,p_idempotency_key,p_payment_method,p_items,v_cash,p_payment_reference);
  v_sale_id := (v_result->>'sale_id')::uuid;
  if coalesce((v_result->>'replayed')::boolean,false) then return v_result; end if;
  update public.bigfoods_pos_sales set
    subtotal=v_subtotal, discount_amount=v_discount, tax_amount=v_tax, total_amount=v_total,
    customer_email=nullif(trim(coalesce(p_customer_email,'')),''),
    cash_received=case when p_payment_method='cash' then p_cash_received else null end,
    change_due=case when p_payment_method='cash' then p_cash_received-v_total else 0 end
    where id=v_sale_id;
  update public.bigfoods_pos_payments set amount=v_total where sale_id=v_sale_id;
  return v_result || jsonb_build_object('subtotal',v_subtotal,'discount_amount',v_discount,'tax_amount',v_tax,'total_amount',v_total,'cash_received',p_cash_received,'change_due',case when p_payment_method='cash' then p_cash_received-v_total else 0 end);
end;
$$;
revoke all on function public.bigfoods_pos_checkout_priced(uuid,uuid,uuid,text,jsonb,numeric,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.bigfoods_pos_checkout_priced(uuid,uuid,uuid,text,jsonb,numeric,text,numeric,text,text) to service_role;
