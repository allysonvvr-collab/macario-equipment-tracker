# Setup Guide — Macario Brothers Equipment & Inventory Tracker

Follow these in order. It's the same flow as your other apps: Supabase →
GitHub → Netlify. Should take about 20–30 minutes the first time.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it something like `macario-equipment-tracker`
3. Pick a database password (different from anything else — just save it somewhere, you won't need it day-to-day)
4. Region: closest to San Antonio (e.g. `us-east-1`)
5. Wait ~2 minutes for it to spin up

## 2. Run the database schema

1. In your new project, go to **SQL Editor** (left sidebar) → **New Query**
2. Open `supabase/schema.sql` from this project folder
3. **Before pasting:** find this line near the bottom —
   ```sql
   values ('Office', 'office@macariobros.com', 'superadmin', crypt('CHANGE_ME_PASSWORD', gen_salt('bf')))
   ```
   Replace `CHANGE_ME_PASSWORD` with the actual password you want for
   `office@macariobros.com`. Keep the quotes around it.
4. Paste the **entire file** into the SQL Editor and click **Run**
5. You should see "Success. No rows returned" — that means every table,
   security rule, and the starter equipment/repair/parts data from your
   Excel sheet are now in place.

> If you ever need to re-run this (e.g. starting fresh), note that it uses
> `on conflict do nothing` for the seed data, so running it twice won't
> duplicate anything — but it will error on `create table` if the tables
> already exist. That's expected; the seed/data parts at the bottom are
> safe to re-run on their own.

## 3. Get your API keys

1. In Supabase: **Project Settings** (gear icon) → **API**
2. Copy the **Project URL** and the **anon / public key** (NOT the
   `service_role` key — never put that one in the app)

## 4. Push the code to GitHub

From the project folder, in a terminal:

```bash
cd macario-equipment-app
git init
git add .
git commit -m "Initial commit — Macario Brothers Equipment Tracker"
```

Then create a new empty repo on [github.com/new](https://github.com/new)
(name it `macario-equipment-tracker`, don't initialize with a README), and:

```bash
git remote add origin https://github.com/YOUR-USERNAME/macario-equipment-tracker.git
git branch -M main
git push -u origin main
```

## 5. Connect Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Connect GitHub, pick the `macario-equipment-tracker` repo
3. Netlify will auto-detect the build settings from `netlify.toml`
   (build command `npm run build`, publish directory `dist`) — leave them as-is
4. **Before deploying**, click **Add environment variables** and add:
   - `VITE_SUPABASE_URL` → the Project URL from step 3
   - `VITE_SUPABASE_ANON_KEY` → the anon key from step 3
5. Click **Deploy**

It'll take 1–2 minutes. Netlify gives you a `something-random.netlify.app`
link — you can rename it under **Site settings → Change site name**, e.g.
`macario-equipment.netlify.app`.

## 6. First login

1. Open your new Netlify link
2. Click **Office Login**, sign in with `office@macariobros.com` and the
   password you set in step 2
3. Go to **Users & Logins** → click the key icon next to "Office" → set a
   new password (so the one sitting in your SQL file isn't the live one
   anymore)
4. Add your crew: **Add User** → Role "Crew" → their name + a 4-digit PIN.
   They'll log in with their first name + that PIN from the **Crew** tab on
   the login screen.

That's it — you're live.

---

## Day to day

- **Repairs:** log them as they happen, DIY or shop. Cost fields total
  themselves automatically.
- **At the shop:** when something's dropped off, set status to "At Shop" —
  it'll show up on the Shop Status page until someone marks it returned.
- **Inventory counts:** whoever does the weekly count just opens Inventory
  & Parts, hits "Update Count" on each item, types the number. History logs
  itself — no duplicating tabs, no pasting into a history sheet.
- **Mower hours:** log a reading whenever it's convenient (oil changes,
  weekly check, whatever rhythm works). It keeps a running history per mower.

## A note on security

This app uses the same trust model as your Door Hanger Tracker: it's a
private link, not indexed anywhere, and the data isn't sensitive (no
customer payment info, etc.), so the operational tables (equipment, repairs,
inventory, checkout) are open to anyone who has the app link and is logged
in. The one table that's locked down at the database level is logins
(`users`) — PINs and passwords are hashed and never sent to the browser, even
to someone poking at the network tab.

If down the road you want bank-vault-level security (e.g. you start storing
something sensitive), that would mean switching to real Supabase Auth with
per-role database policies — a bigger lift, and not something this kind of
internal tool typically needs.

## Loading the real Inventory Planner data

If you've already got the app deployed and just need to bring in the real
Mowing + Weed Control inventory (from Douglas's Inventory Planner sheet):

1. Supabase → **SQL Editor** → **New Query**
2. Open `supabase/02_inventory_planner_seed.sql` from this project folder,
   paste the whole thing, click **Run**
3. Refresh the app → **Inventory & Parts** → you'll see both divisions
   fully populated with real on-hand counts and reorder points

This is a one-time import — run it once, not every week. From then on,
updating a count is just opening the app and hitting "Update Count."

One row at the bottom (a spark plug) came from a slightly garbled row on the
original sheet — worth a quick double-check in the app once it's imported.

## Adding FWC Tracker + Orders

Same idea — one more one-time SQL paste:

1. Supabase → **SQL Editor** → **New Query**
2. Open `supabase/03_fwc_and_orders.sql`, paste the whole thing, click **Run**
3. Refresh the app — you'll see **FWC Tracker** and **Orders** in the sidebar
   under "Field & Orders," both populated with real history from the sheets

**FWC Tracker** replicates the formula from the "June Tracker" sheet exactly:
rounded sq ft = scheduled rounded up to the nearest 1,000; suggested gallons
= (rounded ÷ 1,000) × rate, where rate defaults to 2 but is editable per
entry if a product or season ever calls for a different rate.

**Orders** is one system under the hood with two tabs in the UI — "FWC
Orders" (Harrels/Helena-style chemical orders) and "Online Orders"
(Amazon/Home Depot-style general orders) — so Douglas gets the separation
he asked for without two systems to maintain.

**Fleet Repair Tracker is not built yet** — on hold until that sheet comes
over. Once it does, this is also the moment to add real per-module login
restrictions (e.g. a driver account that only sees Fleet) — right now every
logged-in user can see every module except Users & Logins, which is
admin-only.

## Module-level access control (Office vs Andrew vs Crew)

Run `supabase/04_module_access.sql` once. It:
- Adds a `modules` list to each user (which sidebar items they can see)
- Defaults every existing user to "see everything," so nothing breaks
- Lets you actually restrict people from the app from here on

After running it, go to **Users & Logins**:
- Office / admin accounts always see every module, no setup needed
- For each crew account, click the shield icon and check only the modules
  that person should see — e.g. Andrew gets Inventory + FWC Tracker + Orders;
  mowing crew gets Equipment + Repair Log + Shop Status + Mower Hours +
  Checkout

This is what Douglas actually asked for on Fleet ("2 different logins and
access on the same app") — now it applies everywhere, not just there.

## All the SQL files, in order

If you're setting this up fresh or just want to confirm what's been run:

1. `schema.sql` — everything: tables, security, starter seed data
2. `02_inventory_planner_seed.sql` — real Mowing + Weed Control inventory
3. `03_fwc_and_orders.sql` — FWC Tracker + Orders, with real history
4. `04_module_access.sql` — per-user module permissions

Each one only needs to run once, ever.

## What I left out (easy to add later)

- **Friday Slack reminder for inventory counts** — you said skip it for now,
  but the data model already supports it (every count has a timestamp), so
  it's a small addition whenever you want it.
- **Service-interval alerts on mower hours** (e.g. "flag at 50 hrs since last
  oil change") — straightforward to add once you tell me what intervals you
  actually want flagged.
- **Cost reports by week/month/division** — the dashboard shows recent
  activity now; a dedicated reports page with charts is a natural next step.
