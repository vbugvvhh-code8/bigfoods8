-- Transactional shift-swap decisions. This migration is additive; apply only through the approved migration process.
create or replace function public.bigfoods_staff_review_shift_swap(
  p_request_id uuid,
  p_reviewer_id uuid,
  p_status text,
  p_review_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.bigfoods_staff_shift_swap_requests%rowtype;
  v_source public.bigfoods_staff_shift_assignments%rowtype;
  v_target public.bigfoods_staff_shift_assignments%rowtype;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid decision';
  end if;

  select * into v_request
  from public.bigfoods_staff_shift_swap_requests
  where id = p_request_id
  for update;

  if not found or v_request.status <> 'pending' then
    raise exception 'Request not found or already reviewed';
  end if;

  select * into v_source
  from public.bigfoods_staff_shift_assignments
  where id = v_request.requested_shift_assignment_id
  for update;

  if not found or v_source.staff_id <> v_request.requester_staff_id
     or v_source.status <> 'scheduled'
     or v_source.starts_at <= now() then
    raise exception 'Requested shift is no longer eligible';
  end if;

  if p_status = 'approved' then
    if v_request.target_shift_assignment_id is not null then
      select * into v_target
      from public.bigfoods_staff_shift_assignments
      where id = v_request.target_shift_assignment_id
      for update;
      if not found
        or v_target.staff_id <> v_request.target_staff_id
        or v_target.status <> 'scheduled'
        or v_target.starts_at <= now()
        or v_target.starts_at <> v_source.starts_at
        or v_target.ends_at <> v_source.ends_at then
        raise exception 'Target shift is no longer eligible for a swap';
      end if;
      if exists (
        select 1 from public.bigfoods_staff_attendance
        where shift_assignment_id in (v_source.id, v_target.id)
          and checked_out_at is null
      ) then
        raise exception 'An active attendance session prevents this swap';
      end if;
      update public.bigfoods_staff_shift_assignments
      set staff_id = case when id = v_source.id then v_target.staff_id else v_source.staff_id end,
          updated_at = now()
      where id in (v_source.id, v_target.id);
    else
      if v_request.target_staff_id is null then
        raise exception 'An eligible target staff member is required';
      end if;
      if not exists (
        select 1 from public.bigfoods_staff
        where id = v_request.target_staff_id and is_active = true
      ) then
        raise exception 'Target staff member is inactive';
      end if;
      if exists (
        select 1 from public.bigfoods_staff_shift_assignments x
        where x.staff_id = v_request.target_staff_id
          and x.status = 'scheduled'
          and x.starts_at < v_source.ends_at
          and x.ends_at > v_source.starts_at
      ) then
        raise exception 'Target staff member has a conflicting shift';
      end if;
      if exists (
        select 1 from public.bigfoods_staff_attendance
        where shift_assignment_id = v_source.id and checked_out_at is null
      ) then
        raise exception 'An active attendance session prevents this transfer';
      end if;
      update public.bigfoods_staff_shift_assignments
      set staff_id = v_request.target_staff_id, updated_at = now()
      where id = v_source.id;
    end if;
  end if;

  update public.bigfoods_staff_shift_swap_requests
  set status = p_status, reviewed_by = p_reviewer_id,
      reviewed_at = now(), review_note = nullif(left(coalesce(p_review_note, ''), 1000), '')
  where id = p_request_id;

  return jsonb_build_object('request_id', p_request_id, 'status', p_status);
end;
$$;

revoke all on function public.bigfoods_staff_review_shift_swap(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.bigfoods_staff_review_shift_swap(uuid, uuid, text, text) to service_role;
