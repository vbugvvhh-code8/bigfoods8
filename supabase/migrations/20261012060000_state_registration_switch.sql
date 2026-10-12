create table public.state_registration (
  state text primary key,
  accepting boolean not null default true,
  closed_at timestamptz,
  closed_by uuid references auth.users(id)
);
alter table public.state_registration enable row level security;
create policy "Anyone can read state status" on public.state_registration for select using (true);
create policy "Admins manage state status" on public.state_registration for all using (is_admin()) with check (is_admin());

insert into public.state_registration (state) values
('Abia'),('Adamawa'),('Akwa Ibom'),('Anambra'),('Bauchi'),('Bayelsa'),('Benue'),('Borno'),('Cross River'),('Delta'),
('Ebonyi'),('Edo'),('Ekiti'),('Enugu'),('Gombe'),('Imo'),('Jigawa'),('Kaduna'),('Kano'),('Katsina'),('Kebbi'),('Kogi'),
('Kwara'),('Lagos'),('Nasarawa'),('Niger'),('Ogun'),('Ondo'),('Osun'),('Oyo'),('Plateau'),('Rivers'),('Sokoto'),
('Taraba'),('Yobe'),('Zamfara'),('Federal Capital Territory');

create or replace function public.admin_state_seat_counts()
returns table(state text, paid_sellers bigint, accepting boolean)
language sql stable security definer set search_path = public as $$
  select s.state,
         (select count(distinct t.restaurant_id) from public.transactions t
            join public.restaurants r on r.id = t.restaurant_id
           where t.type = 'onboarding_plan' and t.status = 'success' and r.state = s.state),
         s.accepting
  from public.state_registration s
  where is_admin()
  order by s.state;
$$;
revoke all on function public.admin_state_seat_counts() from public, anon;
grant execute on function public.admin_state_seat_counts() to authenticated;
