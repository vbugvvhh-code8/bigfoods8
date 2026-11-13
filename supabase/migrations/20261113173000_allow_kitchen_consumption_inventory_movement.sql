-- Allow Kitchen preparation to record ingredient stock deductions.
-- Keep the existing movement types and add the dedicated Kitchen movement type.

alter table public.inventory_movements
  drop constraint if exists inventory_movements_movement_type_check;

alter table public.inventory_movements
  add constraint inventory_movements_movement_type_check
  check (movement_type = any (array[
    'receipt'::text,
    'production_input'::text,
    'production_output'::text,
    'sale_usage'::text,
    'waste'::text,
    'transfer_in'::text,
    'transfer_out'::text,
    'count_adjustment'::text,
    'return'::text,
    'opening_balance'::text,
    'kitchen_consumption'::text
  ]));
