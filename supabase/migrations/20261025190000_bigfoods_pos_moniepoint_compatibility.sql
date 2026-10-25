-- Align the POS sales ledger with the cashier's supported cash and physical Moniepoint workflow.
-- Preserve all existing sales and test data; only replace the incompatible payment constraint.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.bigfoods_pos_sales'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%payment_method%'
  loop
    execute format('alter table public.bigfoods_pos_sales drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.bigfoods_pos_sales
  add constraint bigfoods_pos_sales_payment_method_check
  check (payment_method in ('cash', 'moniepoint_pos'));

alter table public.bigfoods_pos_sales
  add constraint bigfoods_pos_sales_cash_fields
  check (
    (payment_method = 'cash' and cash_received is not null and cash_received >= total_amount)
    or (payment_method = 'moniepoint_pos' and cash_received is null)
  ) not valid;

-- Existing records are retained. Validate the new cash-field invariant only for future writes
-- after existing legacy rows have been assessed by the deployment migration runner.
