-- Branch foundation: extend the existing staff work-location entity instead of creating
-- a parallel location model. Shift assignments and attendance already reference this table.
alter table public.bigfoods_staff_work_locations
  add column if not exists branch_code text,
  add column if not exists delivery_coverage_geojson jsonb,
  add column if not exists delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  add column if not exists minimum_order_amount numeric(12,2) not null default 0 check (minimum_order_amount >= 0),
  add column if not exists pickup_enabled boolean not null default true,
  add column if not exists delivery_enabled boolean not null default false,
  add column if not exists opening_time time,
  add column if not exists closing_time time,
  add column if not exists timezone text not null default 'Africa/Lagos';

create unique index if not exists bigfoods_staff_work_locations_branch_code_uidx
  on public.bigfoods_staff_work_locations (upper(branch_code))
  where branch_code is not null;

alter table public.bigfoods_staff_work_locations
  add constraint bigfoods_branch_coverage_geojson_check
  check (
    delivery_coverage_geojson is null
    or (
      jsonb_typeof(delivery_coverage_geojson) = 'object'
      and delivery_coverage_geojson->>'type' = 'Polygon'
      and jsonb_typeof(delivery_coverage_geojson->'coordinates') = 'array'
    )
  );

comment on table public.bigfoods_staff_work_locations is
  'BigFoods branches/work locations. Branch identity is shared with existing shift assignments and attendance.';
comment on column public.bigfoods_staff_work_locations.delivery_coverage_geojson is
  'Optional GeoJSON Polygon defining the delivery area; independent from the staff attendance radius.';
