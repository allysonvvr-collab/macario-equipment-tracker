-- ============================================================================
-- MACARIO BROTHERS — EQUIPMENT & INVENTORY TRACKER
-- Full database schema for Supabase (Postgres)
-- ============================================================================
-- HOW TO USE THIS FILE:
-- 1. Go to your Supabase project → SQL Editor → New Query
-- 2. Paste this ENTIRE file
-- 3. Before running, find the line that says "CHANGE_ME_PASSWORD" near the
--    bottom and replace it with the password you want for office@macariobros.com
-- 4. Click Run
-- That's it — every table, security rule, and starter data point gets created.
-- ============================================================================

-- Needed for password/PIN hashing (crypt + gen_salt)
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- DIVISIONS  (Mowing, Weed Control, Christmas Lights, ...)
-- ----------------------------------------------------------------------------
create table if not exists divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- SHOPS / MECHANICS  (who you send equipment out to)
-- ----------------------------------------------------------------------------
create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_phone text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- USERS  (logins — superadmin uses email+password, crew use name+PIN)
-- Never expose password_hash / pin_hash to the client. All access to this
-- table happens through the SECURITY DEFINER functions below.
-- ----------------------------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  role text not null default 'crew' check (role in ('superadmin','admin','crew')),
  crew text,                 -- e.g. MC1, MC2, MC3, Weed Control, Christmas Lights
  pin_hash text,             -- crew login credential
  password_hash text,        -- superadmin/admin login credential
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table users enable row level security;
-- Intentionally NO select/insert/update policy for the anon role here.
-- All reads/writes to `users` go through the functions below, which run
-- with the privileges of the function owner (SECURITY DEFINER) and only
-- ever return safe, non-secret columns.

-- ----------------------------------------------------------------------------
-- EQUIPMENT  (every asset — mowers, weed eaters, blowers, etc.)
-- ----------------------------------------------------------------------------
create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  type text not null,                 -- Mower, Weed Eater, Blower, Spreader, etc.
  serial_last4 text,
  serial_full text,
  make_model text,
  division text not null default 'Mowing',
  crew_assigned text,                 -- MC1, MC2, MC3, Backup Pool, Parts Only
  status text not null default 'Active' check (status in ('Active','In Repair','Retired')),
  current_hours numeric,              -- latest hour-meter reading (mowers)
  purchase_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_equipment_division on equipment(division);
create index if not exists idx_equipment_crew on equipment(crew_assigned);
create index if not exists idx_equipment_status on equipment(status);

-- ----------------------------------------------------------------------------
-- EQUIPMENT HOURS LOG  (mower hour-meter readings over time)
-- ----------------------------------------------------------------------------
create table if not exists equipment_hours_log (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid references equipment(id) on delete cascade,
  log_date date not null default current_date,
  hours_reading numeric not null,
  logged_by text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_hours_equipment on equipment_hours_log(equipment_id, log_date desc);

-- ----------------------------------------------------------------------------
-- REPAIR LOG  (every repair — DIY or sent to a shop)
-- ----------------------------------------------------------------------------
create table if not exists repair_log (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  equipment_id uuid references equipment(id) on delete set null,
  type text,                          -- denormalized for free-text entries
  crew text,
  serial_last4 text,
  repair_type text,                   -- Filter, Belt, Carburetor, Blade, Other...
  performed_by text,
  diy_or_shop text not null default 'DIY' check (diy_or_shop in ('DIY','Shop')),
  status text not null default 'Completed'
    check (status in ('Completed','At Shop','Waiting on Parts','In Progress')),
  shop_id uuid references shops(id) on delete set null,
  shop_name text,                     -- denormalized, in case shop isn't in directory
  date_sent_to_shop date,
  date_returned date,
  eta date,
  time_minutes numeric,
  rate_per_hour numeric,
  our_labor_cost numeric,
  parts_cost numeric,
  shop_labor_cost numeric,
  total_cost numeric,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_repair_equipment on repair_log(equipment_id);
create index if not exists idx_repair_status on repair_log(status);
create index if not exists idx_repair_date on repair_log(date desc);

-- ----------------------------------------------------------------------------
-- EQUIPMENT CHECKOUT  (crew borrows backup gear from the yard)
-- ----------------------------------------------------------------------------
create table if not exists equipment_checkout (
  id uuid primary key default gen_random_uuid(),
  date_out date not null default current_date,
  borrower text not null,
  crew text,
  equipment_id uuid references equipment(id) on delete set null,
  serial_last4 text,
  type text,
  reason text,
  okd_by text,
  date_returned date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_checkout_returned on equipment_checkout(date_returned);

-- ----------------------------------------------------------------------------
-- PARTS CATALOG  (parts on hand, per division, with reorder points)
-- ----------------------------------------------------------------------------
create table if not exists parts_catalog (
  id uuid primary key default gen_random_uuid(),
  part_name text not null,
  part_number text,
  division text not null default 'Mowing',
  for_equipment_type text,            -- Mower, Weed Eater, Multiple...
  fits text,
  vendor text,
  price numeric,
  on_hand numeric not null default 0,
  reorder_point numeric not null default 0,
  reorder_qty numeric,
  photo_link text,
  last_ordered date,
  last_counted_at timestamptz,
  last_counted_by text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_parts_division on parts_catalog(division);

-- ----------------------------------------------------------------------------
-- INVENTORY COUNT HISTORY  (auto-logged every time someone updates on-hand)
-- This replaces the old "duplicate the tab every week" process.
-- ----------------------------------------------------------------------------
create table if not exists inventory_count_history (
  id uuid primary key default gen_random_uuid(),
  part_id uuid references parts_catalog(id) on delete cascade,
  count_date date not null default current_date,
  on_hand_qty numeric not null,
  counted_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_inv_history_part on inventory_count_history(part_id, count_date desc);

-- ============================================================================
-- ROW LEVEL SECURITY — operational tables
-- Internal tool, low-sensitivity data, accessed only via a private app link.
-- Same trust model used in the Door Hanger Tracker: anon key can read/write
-- these tables freely; the only table with locked-down access is `users`.
-- ============================================================================
alter table divisions enable row level security;
alter table shops enable row level security;
alter table equipment enable row level security;
alter table equipment_hours_log enable row level security;
alter table repair_log enable row level security;
alter table equipment_checkout enable row level security;
alter table parts_catalog enable row level security;
alter table inventory_count_history enable row level security;

create policy "public rw divisions" on divisions for all using (true) with check (true);
create policy "public rw shops" on shops for all using (true) with check (true);
create policy "public rw equipment" on equipment for all using (true) with check (true);
create policy "public rw hours" on equipment_hours_log for all using (true) with check (true);
create policy "public rw repairs" on repair_log for all using (true) with check (true);
create policy "public rw checkout" on equipment_checkout for all using (true) with check (true);
create policy "public rw parts" on parts_catalog for all using (true) with check (true);
create policy "public rw inv_history" on inventory_count_history for all using (true) with check (true);

-- ============================================================================
-- AUTH FUNCTIONS  (the only way the app ever touches the `users` table)
-- ============================================================================

-- Check a login (email+password for superadmin/admin, or name+PIN for crew).
-- Returns the safe user fields on success, or zero rows on failure.
create or replace function verify_login(p_identifier text, p_credential text)
returns table (id uuid, name text, email text, role text, crew text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select u.id, u.name, u.email, u.role, u.crew
  from users u
  where u.active = true
    and (
      (u.email is not null and lower(u.email) = lower(p_identifier)
        and u.password_hash is not null
        and u.password_hash = crypt(p_credential, u.password_hash))
      or
      (lower(u.name) = lower(p_identifier)
        and u.pin_hash is not null
        and u.pin_hash = crypt(p_credential, u.pin_hash))
    )
  limit 1;
end;
$$;

-- List users for the admin "Users / PINs" page — never returns hashes.
create or replace function admin_list_users()
returns table (id uuid, name text, email text, role text, crew text, active boolean, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select u.id, u.name, u.email, u.role, u.crew, u.active, u.created_at
  from users u
  order by u.role = 'superadmin' desc, u.role = 'admin' desc, u.name asc;
$$;

-- Create a new user. p_password is used as the PIN for crew, or the
-- password for admin/superadmin — either way it gets hashed here.
create or replace function admin_create_user(
  p_name text, p_email text, p_role text, p_crew text, p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if p_role = 'crew' then
    insert into users (name, email, role, crew, pin_hash)
    values (p_name, nullif(p_email,''), p_role, nullif(p_crew,''), crypt(p_password, gen_salt('bf')))
    returning id into new_id;
  else
    insert into users (name, email, role, crew, password_hash)
    values (p_name, nullif(p_email,''), p_role, nullif(p_crew,''), crypt(p_password, gen_salt('bf')))
    returning id into new_id;
  end if;
  return new_id;
end;
$$;

-- Update a user's basic info (name/email/role/crew/active) without touching
-- their credential.
create or replace function admin_update_user(
  p_id uuid, p_name text, p_email text, p_role text, p_crew text, p_active boolean
)
returns void
language sql
security definer
set search_path = public
as $$
  update users
  set name = p_name, email = nullif(p_email,''), role = p_role,
      crew = nullif(p_crew,''), active = p_active
  where id = p_id;
$$;

-- Reset a user's PIN or password.
create or replace function admin_reset_credential(p_id uuid, p_role text, p_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role = 'crew' then
    update users set pin_hash = crypt(p_password, gen_salt('bf')) where id = p_id;
  else
    update users set password_hash = crypt(p_password, gen_salt('bf')) where id = p_id;
  end if;
end;
$$;

-- ============================================================================
-- HELPER FUNCTIONS for inventory & hours (keep update + history-log atomic)
-- ============================================================================

-- Update a part's on-hand count and automatically log it to history.
create or replace function update_part_count(p_part_id uuid, p_qty numeric, p_counted_by text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update parts_catalog
  set on_hand = p_qty, last_counted_at = now(), last_counted_by = p_counted_by, updated_at = now()
  where id = p_part_id;

  insert into inventory_count_history (part_id, count_date, on_hand_qty, counted_by)
  values (p_part_id, current_date, p_qty, p_counted_by);
end;
$$;

-- Log a new hour-meter reading and keep equipment.current_hours in sync.
create or replace function log_equipment_hours(
  p_equipment_id uuid, p_hours numeric, p_logged_by text, p_notes text, p_log_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into equipment_hours_log (equipment_id, log_date, hours_reading, logged_by, notes)
  values (p_equipment_id, coalesce(p_log_date, current_date), p_hours, p_logged_by, p_notes);

  update equipment
  set current_hours = p_hours, updated_at = now()
  where id = p_equipment_id and (current_hours is null or p_hours >= current_hours);
end;
$$;

grant execute on function verify_login(text, text) to anon, authenticated;
grant execute on function admin_list_users() to anon, authenticated;
grant execute on function admin_create_user(text, text, text, text, text) to anon, authenticated;
grant execute on function admin_update_user(uuid, text, text, text, text, boolean) to anon, authenticated;
grant execute on function admin_reset_credential(uuid, text, text) to anon, authenticated;
grant execute on function update_part_count(uuid, numeric, text) to anon, authenticated;
grant execute on function log_equipment_hours(uuid, numeric, text, text, date) to anon, authenticated;

-- ============================================================================
-- SEED DATA — pulled straight from your existing Equipment_Repair_Tracker.xlsx
-- ============================================================================

insert into divisions (name) values
  ('Mowing'), ('Weed Control'), ('Christmas Lights')
on conflict (name) do nothing;

insert into shops (name, contact_phone, address, notes) values
  ('Stinger Equipment Repair', '(830) 358-1171', '194 S Grape Ave, New Braunfels, TX 78130', 'Same-day repair for spray tanks. Primary shop.'),
  ('Paul K', null, null, 'Outside mechanic — belts, carburetors.')
on conflict do nothing;

-- Crew Assignments → equipment (status + crew mapped from the sheet's sections)
insert into equipment (type, serial_last4, make_model, division, crew_assigned, status, notes) values
  ('Mower','6731','Exmark','Mowing','MC1','Active',null),
  ('Mower','6520','Toro 21','Mowing','MC1','Active',null),
  ('Weed Eater','6913','Echo','Mowing','MC1','Active',null),
  ('Weed Eater','1531','Shindaiwa','Mowing','MC1','Active',null),
  ('Blower','6156','Echo 580T','Mowing','MC1','Active',null),
  ('Blower','5514','Small Blower','Mowing','MC1','Active',null),

  ('Mower','5904','Exmark','Mowing','MC2','Active','Fixed spindle and new big black belt on 6/16/26'),
  ('Mower','5581','Toro 21','Mowing','MC2','Active','1998 — manually have to shut off, bottom blade doesn''t come off'),
  ('Hedge Trimmer','5016','HT','Mowing','MC2','Active',null),
  ('Weed Eater','9008','Echo','Mowing','MC2','Active',null),
  ('Weed Eater','6913','Echo','Mowing','MC2','Active',null),
  ('Blower','2977','Echo 7910T','Mowing','MC2','Active',null),
  ('Blower','6426','Small Blower','Mowing','MC2','Active',null),

  ('Mower','7195','Toro 21','Mowing','MC3','Active',null),
  ('Mower','4107','Exmark','Mowing','MC3','Active',null),
  ('Other','0774','ATC','Mowing','MC3','Active',null),
  ('Weed Eater','5007','Echo','Mowing','MC3','Active',null),
  ('Weed Eater','7950','Echo','Mowing','MC3','Active',null),
  ('Blower','Husq','Husqvarna','Mowing','MC3','Active',null),
  ('Blower','3722','Small Blower','Mowing','MC3','Active',null),

  ('Mower','5233',null,'Mowing','Backup Pool','Active',null),
  ('Mower','9008',null,'Mowing','Backup Pool','Active',null),
  ('Weed Eater','2475',null,'Mowing','Backup Pool','Active',null),
  ('Weed Eater','2866',null,'Mowing','Backup Pool','Active',null),
  ('Edger','5016','Trimiadora','Mowing','Backup Pool','Active',null),
  ('Blower','0774',null,'Mowing','Backup Pool','Active','Confirm — collision'),
  ('Chainsaw','8797','Motosierra','Mowing','Backup Pool','Active',null),
  ('Chainsaw','8053','Grande','Mowing','Backup Pool','Active',null),
  ('Chainsaw',null,'Pequeña','Mowing','Backup Pool','Active','Needs serial'),

  ('Mower','5905',null,'Mowing','Backup Pool','In Repair',null),
  ('Blower','0232',null,'Mowing','Backup Pool','In Repair',null),
  ('Blower','0423',null,'Mowing','Backup Pool','In Repair',null),

  ('Mower','3727',null,'Mowing','Parts Only','Retired',null),
  ('Mower','7108',null,'Mowing','Parts Only','Retired',null),
  ('Mower','8178',null,'Mowing','Parts Only','Retired',null),
  ('Mower','5236',null,'Mowing','Parts Only','Retired',null),
  ('Weed Eater','3122',null,'Mowing','Parts Only','Retired',null),
  ('Weed Eater','4528',null,'Mowing','Parts Only','Retired',null),
  ('Blower','1531',null,'Mowing','Parts Only','Retired',null)
on conflict do nothing;

-- Repair Log — real history from the sheet
insert into repair_log (date, serial_last4, type, crew, repair_type, performed_by, diy_or_shop, status, time_minutes, rate_per_hour, our_labor_cost, parts_cost, shop_labor_cost, total_cost, notes) values
  ('2026-06-12', null, 'Mower', 'MC2', 'Filter', 'Alberto', 'DIY', 'Completed', 5, 20, 1.67, null, null, 1.67, 'Filtro de aire'),
  ('2026-06-12', null, 'Spreader', 'MC1', 'Other', 'Alberto', 'DIY', 'Completed', 7, 20, 2.33, null, null, 2.33, 'Soporte de correa'),
  ('2026-06-03', '5905', 'Mower', 'MC1', 'Other', 'Alberto', 'DIY', 'Completed', 20, 20, 6.67, 16.17, null, 22.84, 'Bujía banda azul'),
  ('2025-11-03', '5856', 'Mower', 'MC2', 'Other', 'Alberto', 'DIY', 'Completed', 15, 20, 5, null, null, 5, 'Ajuste tiempo banda'),
  ('2025-11-03', '5905', 'Mower', 'MC1', 'Carburetor', 'Alberto', 'DIY', 'Completed', 45, 20, 15, null, null, 15, 'Limpieza carburador'),
  ('2025-11-05', '1234', 'Mower', 'MC2', 'Belt', 'Paul K', 'Shop', 'Completed', null, null, 0, 35.00, 90.00, 125, 'Paul K — belt + labor'),
  ('2026-06-01', '5904', 'Mower', 'MC1', 'Carburetor', 'Paul K', 'Shop', 'At Shop', null, null, 0, null, null, 0, 'Dropped off 6/1, ETA 6/5'),
  ('2026-06-17', '1999', 'Mower', 'MC1', 'Belt', 'Alberto', 'DIY', 'Completed', 20, 20, 6.67, null, null, 6.67, null)
on conflict do nothing;

-- Equipment Checkout — real history from the sheet
insert into equipment_checkout (date_out, borrower, crew, serial_last4, type, reason, okd_by, date_returned, notes) values
  ('2025-11-05', 'Oscar', 'MC1', '5233', 'Mower', 'Backup during repair', 'Ryan', '2025-11-08', null),
  ('2025-11-10', 'Mario', 'MC2', '2475', 'Weed Eater', 'Backup during repair', 'Ryan', null, '7098 carb cleaning')
on conflict do nothing;

-- Parts Catalog — real items from the sheet (all tagged Mowing for now —
-- add Weed Control / Christmas Lights items from the app once it's live)
insert into parts_catalog (part_name, part_number, division, for_equipment_type, fits, vendor, price, on_hand, reorder_point, reorder_qty, last_ordered, notes) values
  ('Air Filter (Honda GX)', '17211-ZL8-023', 'Mowing', 'Mower', 'Honda commercial mowers', 'PartsTree', 8.50, 4, 2, 4, '2026-02-10', null),
  ('Mower Blade 21"', null, 'Mowing', 'Mower', '21" decks (5856, 1998, 6520)', 'PartsTree', 18.00, 6, 3, 6, '2026-01-15', 'Set of 2'),
  ('Trimmer Line .095', null, 'Mowing', 'Weed Eater', 'All weed eaters', 'Amazon', 42.99, 2, 1, 2, '2026-02-22', '5lb spool'),
  ('Spark Plug (NGK BPMR7A)', 'BPMR7A', 'Mowing', 'Multiple', 'Most 2-stroke handhelds', 'PowerMowerSales', 4.25, 12, 6, 12, '2026-02-01', null),
  ('Drive Belt (Exmark)', '116-4665', 'Mowing', 'Mower', 'Exmark 30" walk-behind', 'SawAgain', 35.00, 1, 1, 2, '2025-12-10', null),
  ('Fuel Filter (Stihl)', '0000-350-3503', 'Mowing', 'Multiple', 'Stihl blowers, trimmers', 'PowerMowerSales', 3.50, 8, 4, 8, '2026-02-20', null)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- SUPERADMIN LOGIN — change the password below before running this file!
-- ----------------------------------------------------------------------------
insert into users (name, email, role, password_hash)
values ('Office', 'office@macariobros.com', 'superadmin', crypt('MacarioBros2026!', gen_salt('bf')))
on conflict (email) do nothing;

-- Done! Next: in your app's .env, set VITE_SUPABASE_URL and
-- VITE_SUPABASE_ANON_KEY, then log in with office@macariobros.com and
-- whatever password you set above. Change it from inside the app right away
-- (Users page → Reset Password) so it's not sitting in this file anymore.
