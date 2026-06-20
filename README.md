# Macario Brothers — Equipment & Inventory Tracker

A real, multi-user web app for tracking equipment, repairs, mower hours, and
parts/inventory — built on the same free-tier stack as your other apps
(React + Vite, Supabase, Netlify, GitHub).

**First time setting this up?** Open `SETUP_GUIDE.md` — it walks through every
step from zero to a live link, in order.

## What's inside

| Page | What it does |
|---|---|
| **Dashboard** | Equipment at-a-glance: active count, at shop, low/out of stock parts, recent repairs |
| **All Equipment** | Every asset — mowers, weed eaters, blowers, etc. Filter by division/crew/status. Click into one for its full history. |
| **Repair Log** | Every repair, DIY or shop, with parts/labor cost. Total cost calculates itself as you type. |
| **Shop Status** | Everything currently sitting at a shop/mechanic, oldest first, with a "Mark Returned" button |
| **Mower Hours** | Log hour-meter readings per mower over time |
| **Inventory & Parts** | Stock per division (Mowing, Weed Control, Christmas Lights, …) with reorder points. Updating a count auto-logs history — no more duplicating tabs every week. |
| **Checkout Log** | Backup/loaner equipment handed out from the yard |
| **FWC Tracker** | Daily chemical application log — scheduled turf sq ft → suggested gallons (2 gal/1,000 sq ft, editable rate) → actual gallons used, flagged if more than 10% off target |
| **Orders** | One log, two views — "FWC Orders" (Harrels/Helena chemical orders) and "Online Orders" (Amazon/Home Depot general orders) |
| **Users & Logins** *(admin only)* | Add crew (name + PIN) or office/admin accounts (email + password), reset PINs/passwords |

## Logins

- **Office / superadmin:** email + password (`office@macariobros.com`)
- **Crew:** first name + a 4-digit PIN (set up from the Users page)

## Local development

```
npm install
cp .env.example .env      # then fill in your Supabase URL + anon key
npm run dev
```

## Tech stack

- React 19 + Vite — frontend
- Supabase (Postgres) — database, auth checks via SQL functions
- Netlify — hosting + auto-deploy from GitHub
- Plain CSS (no Tailwind) — see `src/styles/global.css` for the whole design system
