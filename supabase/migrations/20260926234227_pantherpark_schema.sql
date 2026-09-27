-- PantherPark schema, namespaced pantherpark_* to avoid colliding with
-- the existing ResumeFit schema in this shared Supabase project.

create table pantherpark_facilities (
  id text primary key,
  name text not null,
  full_name text,
  type text not null check (type in ('lot', 'garage')),
  display_hidden boolean not null default false,
  latitude double precision,
  longitude double precision,
  max_occupancy_total int,
  current_total int,
  current_pct numeric,
  is_unreliable boolean not null default false,
  last_polled_at timestamptz,
  raw_json jsonb
);

create table pantherpark_occupancy_snapshots (
  id bigserial primary key,
  facility_id text not null references pantherpark_facilities(id),
  ts timestamptz not null default now(),
  current_total int,
  max_total int,
  occupancy_pct numeric,
  is_unreliable boolean not null default false
);

create index idx_pantherpark_snapshots_facility_ts
  on pantherpark_occupancy_snapshots (facility_id, ts desc);

create table pantherpark_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create function pantherpark_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.pantherpark_profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger pantherpark_on_auth_user_created
  after insert on auth.users
  for each row execute procedure pantherpark_handle_new_user();

create table pantherpark_saved_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Schedule',
  term_code text not null default '1268',
  classes jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pantherpark_user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  walk_speed_mps numeric not null default 1.3,
  buffer_minutes int not null default 12
);

create table pantherpark_plan_history (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  class_snapshot jsonb,
  recommended_lot text,
  target_arrival timestamptz,
  created_at timestamptz not null default now()
);

-- RLS

alter table pantherpark_facilities enable row level security;
alter table pantherpark_occupancy_snapshots enable row level security;
alter table pantherpark_profiles enable row level security;
alter table pantherpark_saved_schedules enable row level security;
alter table pantherpark_user_preferences enable row level security;
alter table pantherpark_plan_history enable row level security;

create policy pantherpark_facilities_select_all
  on pantherpark_facilities for select
  to anon, authenticated
  using (true);

create policy pantherpark_snapshots_select_all
  on pantherpark_occupancy_snapshots for select
  to anon, authenticated
  using (true);

create policy pantherpark_profiles_own_row
  on pantherpark_profiles for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy pantherpark_saved_schedules_own_rows
  on pantherpark_saved_schedules for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy pantherpark_user_preferences_own_row
  on pantherpark_user_preferences for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy pantherpark_plan_history_own_rows
  on pantherpark_plan_history for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Note: no insert/update/delete policy is defined for pantherpark_facilities /
-- pantherpark_occupancy_snapshots for anon/authenticated roles. The collector
-- writes using the service_role key, which bypasses RLS entirely.
