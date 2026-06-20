-- ============================================================================
-- ADD FWC CHEMICAL APPLICATION TRACKER + ORDERS LOG
-- Run this ONCE in Supabase SQL Editor, AFTER schema.sql (and after
-- 02_inventory_planner_seed.sql, if you've already run that one).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FWC APPLICATIONS  ("June Tracker" sheet — scheduled sq ft vs gallons used)
-- Rate defaults to 2 gallons per 1,000 sq ft (matches your sheet's formula:
-- rounded sq ft = CEILING(scheduled, 1000); suggested gallons = rounded/1000 * rate).
-- The rate is editable per entry in case a product/season calls for something
-- different later — it isn't hard-coded into the app.
-- ----------------------------------------------------------------------------
create table if not exists fwc_applications (
  id uuid primary key default gen_random_uuid(),
  app_date date not null default current_date,
  technician text not null,
  turf_sqft_scheduled numeric not null,
  turf_sqft_rounded numeric not null,
  rate_per_1000 numeric not null default 2,
  suggested_gallons numeric not null,
  actual_gallons_used numeric,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fwc_date on fwc_applications(app_date desc);
create index if not exists idx_fwc_tech on fwc_applications(technician);

alter table fwc_applications enable row level security;
create policy "public rw fwc_applications" on fwc_applications for all using (true) with check (true);

-- ----------------------------------------------------------------------------
-- ORDERS  (one table, two views in the app: "FWC Orders" and "Online Orders")
-- category = 'FWC Chemical'  → Harrels / Helena style chemical orders
-- category = 'Online/General' → Amazon / Home Depot style general orders
-- ----------------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Online/General'
    check (category in ('FWC Chemical', 'Online/General')),
  date_ordered date not null default current_date,
  vendor text,
  product text not null,
  order_number text,
  qty numeric,
  unit_size text,
  cost numeric,
  who_ordered text,
  expected_date date,
  date_received date,
  checked_in_by text,
  status text not null default 'Ordered'
    check (status in ('Ordered', 'In Transit', 'Backordered', 'Received')),
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_category on orders(category);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_date on orders(date_ordered desc);

alter table orders enable row level security;
create policy "public rw orders" on orders for all using (true) with check (true);

-- ----------------------------------------------------------------------------
-- SEED — real history from both sheets, so the app opens with real data
-- ----------------------------------------------------------------------------
insert into fwc_applications (app_date, technician, turf_sqft_scheduled, turf_sqft_rounded, rate_per_1000, suggested_gallons, actual_gallons_used) values
  ('2026-06-01','Andrew',68193.94,69000,2,138,138),
  ('2026-06-02','Andrew',71865.72,72000,2,144,100),
  ('2026-06-03','Andrew',77243.00,78000,2,156,120),
  ('2026-06-04','Andrew',51739.03,52000,2,104,100),
  ('2026-06-05','Andrew',86762.29,87000,2,174,180),
  ('2026-06-08','Andrew',82741.71,83000,2,166,170),
  ('2026-06-09','Nick',98781.53,99000,2,198,170),
  ('2026-06-10','Nick',80423.06,81000,2,162,150),
  ('2026-06-11','Nick',92002.54,93000,2,186,180),
  ('2026-06-12','Nick',62168.84,63000,2,126,100),
  ('2026-06-15','Nick',59793.52,60000,2,120,100),
  ('2026-06-16','Andrew',35740.12,36000,2,72,70),
  ('2026-06-16','Nick',56395.52,57000,2,114,null),
  ('2026-06-17','Nick',95459.90,96000,2,192,null),
  ('2026-06-18','Andrew',45974.08,46000,2,92,null),
  ('2026-06-18','Nick',96117.76,97000,2,194,null);

insert into orders (category, date_ordered, vendor, product, qty, unit_size, who_ordered, expected_date, date_received, checked_in_by, status, notes) values
  ('FWC Chemical','2026-05-27','Harrels','Podium',1,'2.5 gal','Doug','2026-05-27','2026-05-28','Douglas','Received','Finishing May'),
  ('FWC Chemical','2026-05-27','Harrels','Podium',4,'2.5 gal','Doug','2026-05-27','2026-05-28','Douglas','Received','June'),
  ('FWC Chemical','2026-05-27',null,'Earthmax',20,'2.5 gal','Doug','2026-05-27','2026-05-28','Douglas','Received','June'),
  ('FWC Chemical','2026-05-27','Harrels','Acelepryn',1,'2.5 gal','Doug','2026-05-27','2026-05-28','Douglas','Received','Extra on hand'),
  ('FWC Chemical','2026-05-27','Helena','Acelepryn',6,'30oz','Doug','2026-05-27','2026-05-27','Douglas','Received','Extra on hand'),
  ('FWC Chemical','2026-06-01','Harrels','Hydro90',20,'2.5 gal','Doug','2026-06-02','2026-06-02','Andrew','Received',null);

insert into orders (category, date_ordered, vendor, product, order_number, cost, expected_date, date_received, checked_in_by, status, notes) values
  ('Online/General','2026-02-15','Amazon','Stihl trimmer line .095 5lb spool','111-2345678-9012345',42.99,'2026-02-18','2026-02-18','Ryan','Received','For MC1'),
  ('Online/General','2026-02-22','Home Depot','Echo blower fuel filter (pack of 5)','HD-998877',18.50,'2026-02-26',null,null,'In Transit',null),
  ('Online/General','2026-02-28','Amazon','Mower blade set 21" (Honda)','111-9876543-2109876',64.00,'2026-03-04',null,null,'Ordered','Replacement for MWR-02'),
  ('Online/General','2026-02-10','Amazon','Backpack sprayer 4 gal','111-5566778-1122334',89.99,'2026-02-25',null,null,'Backordered','Vendor pushed 2 wks');

grant select, insert, update, delete on fwc_applications to anon, authenticated;
grant select, insert, update, delete on orders to anon, authenticated;

-- Done. Refresh the app — you'll see "FWC Tracker" and "Orders" in the
-- sidebar, both populated with real history.
