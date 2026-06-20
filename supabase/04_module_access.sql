-- ============================================================================
-- ADD MODULE-LEVEL ACCESS CONTROL
-- Run this ONCE, after schema.sql / 02 / 03 have already been run.
-- This is what Douglas asked for on Fleet ("2 different logins and access on
-- the same app") — now applied across every module, not just Fleet.
-- ============================================================================

-- 1) New column: which modules a user can see. Superadmin/admin always see
--    everything regardless of this list — it only restricts the 'crew' role.
alter table users add column if not exists modules text[] not null default '{}';

-- 2) Don't break anyone already added: give every existing user every module
--    for now. Go to Users & Logins in the app afterward to dial individual
--    people back (e.g. set Andrew to just inventory/fwc/orders).
update users set modules = array[
  'equipment','repairs','shop_status','hours','inventory','checkout','fwc','orders'
] where modules = '{}';

-- 3) Replace the auth functions so `modules` comes back on login and is
--    manageable from the Users page. (Drop first — adding a return column
--    changes the function's signature, which CREATE OR REPLACE won't allow.)

drop function if exists verify_login(text, text);
create function verify_login(p_identifier text, p_credential text)
returns table (id uuid, name text, email text, role text, crew text, modules text[])
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select u.id, u.name, u.email, u.role, u.crew, u.modules
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

drop function if exists admin_list_users();
create function admin_list_users()
returns table (id uuid, name text, email text, role text, crew text, modules text[], active boolean, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select u.id, u.name, u.email, u.role, u.crew, u.modules, u.active, u.created_at
  from users u
  order by u.role = 'superadmin' desc, u.role = 'admin' desc, u.name asc;
$$;

drop function if exists admin_create_user(text, text, text, text, text);
create function admin_create_user(
  p_name text, p_email text, p_role text, p_crew text, p_password text, p_modules text[] default '{}'
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
    insert into users (name, email, role, crew, pin_hash, modules)
    values (p_name, nullif(p_email,''), p_role, nullif(p_crew,''), crypt(p_password, gen_salt('bf')), coalesce(p_modules, '{}'))
    returning id into new_id;
  else
    insert into users (name, email, role, crew, password_hash, modules)
    values (p_name, nullif(p_email,''), p_role, nullif(p_crew,''), crypt(p_password, gen_salt('bf')), coalesce(p_modules, '{}'))
    returning id into new_id;
  end if;
  return new_id;
end;
$$;

drop function if exists admin_update_user(uuid, text, text, text, text, boolean);
create function admin_update_user(
  p_id uuid, p_name text, p_email text, p_role text, p_crew text, p_active boolean, p_modules text[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update users
  set name = p_name, email = nullif(p_email,''), role = p_role,
      crew = nullif(p_crew,''), active = p_active,
      modules = coalesce(p_modules, modules)
  where id = p_id;
end;
$$;

grant execute on function verify_login(text, text) to anon, authenticated;
grant execute on function admin_list_users() to anon, authenticated;
grant execute on function admin_create_user(text, text, text, text, text, text[]) to anon, authenticated;
grant execute on function admin_update_user(uuid, text, text, text, text, boolean, text[]) to anon, authenticated;

-- 4) Suggested starting point — uncomment and run if you want me to set this
--    up for you right now instead of clicking through the Users page.
--    (Replace 'Andrew' with the exact name on his account.)
--
-- update users set modules = array['inventory','fwc','orders'] where name = 'Andrew';
-- update users set modules = array['equipment','repairs','shop_status','hours','checkout'] where role = 'crew' and name <> 'Andrew';

-- Done. Office (superadmin) always sees every module no matter what's in
-- this list — `modules` only restricts the crew role.
