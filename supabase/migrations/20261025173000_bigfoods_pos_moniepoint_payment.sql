-- Align the in-person POS ledger with cash and physical Moniepoint terminal payments.
alter table public.bigfoods_pos_sales
  drop constraint if exists bigfoods_pos_sales_payment_method_check;
alter table public.bigfoods_pos_sales
  add constraint bigfoods_pos_sales_payment_method_check
  check (payment_method in ('cash', 'moniepoint_pos'));

alter table public.bigfoods_pos_sales
  drop constraint if exists bigfoods_pos_sales_cash_fields;
alter table public.bigfoods_pos_sales
  add constraint bigfoods_pos_sales_cash_fields check (
    (payment_method = 'cash' and cash_received is not null and cash_received >= total_amount)
    or (payment_method = 'moniepoint_pos' and cash_received is null)
  );
