-- ============================================================================
-- ADD INVENTORY PLANNER DATA  (Mowing + Weed Control)
-- Run this ONCE in Supabase SQL Editor, AFTER schema.sql has already been run.
-- Pulled straight from "Inventory planner" — Fertilizer (June 19) + Corte (May 22).
-- ============================================================================

-- 1) Add a "unit" column so On Hand reads like "7 Bags" instead of just "7"
alter table parts_catalog add column if not exists unit text;

-- 2) Weed Control items (from the "Fertilizante" tabs)
insert into parts_catalog (part_name, division, unit, on_hand, reorder_point, notes) values
  ('Black Mulch', 'Weed Control', 'Bag', 7, 10, null),
  ('Non-Ionic P+', 'Weed Control', 'Gallon', 1.5, 0, null),
  ('Southside', 'Weed Control', 'Bottle', 0.5, 1, null),
  ('Sertay', 'Weed Control', 'Bottle', 11, 2, null),
  ('Celsius WG', 'Weed Control', 'Bag/Pack', 9, 2, null),
  ('Indicator Blue — Backup Dye', 'Weed Control', 'Gallon', 4, 2, '1-gal jugs; mix 36–48 oz'),
  ('Super Signal Blue', 'Weed Control', '2.5-gal jug', 5.3, 2, 'Try 32 oz (normal 48 oz)'),
  ('Certainty', 'Weed Control', 'Bag/Pack', 0, 0, null),
  ('Resolute 4L', 'Weed Control', 'Big bottle', 0.5, 1, 'Track as fraction (e.g. 0.50)'),
  ('Talstar', 'Weed Control', 'Jug', 2, 1, 'Restock when low'),
  ('Specticle Flo', 'Weed Control', 'Bottle', 2, 1, null),
  ('Speedzone Southern', 'Weed Control', 'Bottle', 1, 1, null),
  ('Root Enhancer', 'Weed Control', 'Bottle', 0.3, 1, null),
  ('Hydro 90', 'Weed Control', 'Jug', 10, 1, null),
  ('Hydro 90G', 'Weed Control', 'Bag', 0, 0, 'Granular'),
  ('Earthmax', 'Weed Control', 'Jug', 13, 1, null),
  ('Trilogy', 'Weed Control', 'Jug', 1, 0, 'Track as fraction (e.g. 0.50)'),
  ('RV Antifreeze', 'Weed Control', 'Jug', 15, 10, null),
  ('Extinguish', 'Weed Control', 'Bag/Canister', 1, 1, 'Track as fraction (e.g. 0.50)'),
  ('Ranger Round Up', 'Weed Control', 'Jug', 0.5, 1, null),
  ('Surfactant 820', 'Weed Control', 'Jug', 1.5, 1, null),
  ('Prodiamine', 'Weed Control', 'Jug', 2, 1, null),
  ('Acelepryn', 'Weed Control', 'Jug', 0.5, 1, null),
  ('Clorox', 'Weed Control', 'Jug', 2, 1, null),
  ('Podium', 'Weed Control', 'Jug', 3, 2, null),
  ('Katana', 'Weed Control', 'Bottle', 0, 0, null),
  ('Acelepryn 30oz', 'Weed Control', 'Bottle', 4, 0, null),
  ('35-0-5', 'Weed Control', 'Bag', 8, 0, null),
  ('Black Kow', 'Weed Control', 'Bag', 0, 0, null);

-- 3) Mowing items (from the "Corte" tabs)
insert into parts_catalog (part_name, division, unit, on_hand, reorder_point, notes) values
  ('Hilo / Trimmer Line', 'Mowing', 'Roll', 3, 2, null),
  ('Bolsas de basura / Trash Bags', 'Mowing', 'Bag/Box', 5, 2, null),
  ('Cuchillas de cortacésped / Mower Blades', 'Mowing', 'Blade', 25, 6, null),
  ('Correa – Cuchillas / Blade Belt', 'Mowing', 'Belt', 1, 2, null),
  ('Correa – Accionar / Blue Drive Belt', 'Mowing', 'Belt', 9, 4, null),
  ('Conjunto de husillo / Spindle Assembly', 'Mowing', 'Set', 20, 2, null),
  ('125-2466 Tornillos para blades (2 pc)', 'Mowing', '2-pc Set', 4, 4, null),
  ('Tubos de aceite / Oil Tubes', 'Mowing', 'Tube', 2, 0, null),
  ('Filtro Kawasaki / KAWA Filter', 'Mowing', 'Filter', 0, 4, 'https://www.amazon.com/dp/B0F5GTC78T'),
  ('Filtro Kohler / KOHLER Filter', 'Mowing', 'Filter', 2, 4, 'https://www.amazon.com/gp/product/B096ZY6V7P'),
  ('Filtro Toro', 'Mowing', 'Filter', 1, 4, null),
  ('Filtro de aire Kohler / Air Filter', 'Mowing', 'Filter', 2, 0, null),
  ('Aceite 2 ciclos / 2-Cycle Oil (1-gal)', 'Mowing', '1-gal jug', 1, 0, null),
  ('Aceite 2 ciclos / 2-Cycle Oil (2.5-gal)', 'Mowing', '2.5-gal', 36, 10, null),
  ('Spray Wasp / Wasp Spray', 'Mowing', 'Can', 8, 2, null),
  ('Líquido lavacristales / Windshield Fluid', 'Mowing', 'Bottle', 1, 1, null),
  ('Líquido power steering', 'Mowing', 'Bottle', 3, 2, null),
  ('Refrigerante / Coolant', 'Mowing', 'Jug', 4, 4, null),
  ('Aceite Kohler', 'Mowing', 'Qt/Jug', 2, 2, null),
  ('Aceite Kawasaki', 'Mowing', 'Qt/Jug', 3, 2, null),
  ('Aceite Toro', 'Mowing', 'Qt/Jug', 1, 2, null),
  ('120-5236 Adaptador cortacésped / Mower Adapter', 'Mowing', 'Ea', 2, 2, null),
  ('Cable de accionaje / Drive Cable', 'Mowing', 'Cable', 2, 2, null),
  ('Cable de freno / Brake Cable', 'Mowing', 'Cable', 0, 2, null),
  ('Hielo / Ice', 'Mowing', 'Bag', 0, 0, null),
  ('Kit montaje de frenos / Brake Kit', 'Mowing', 'Kit', 1, 2, null),
  ('137-4807 Cable de tracción / Traction Cable', 'Mowing', 'Cable', 2, 2, null),
  ('133-2622 Cable de freno / Brake Cable', 'Mowing', 'Cable', 1, 2, null),
  ('139-1845 Resorte tensión / Belt Spring', 'Mowing', 'Spring', 8, 2, null),
  ('120-3335 Cinturón cubierta / Deck Belt', 'Mowing', 'Belt', 1, 2, 'https://www.amazon.com/gp/product/B0892NTFSY'),
  ('139-1842 Kit de transmisión / Transmission Kit', 'Mowing', 'Kit', 0, 2, null),
  ('Cadena motosierra 63/45', 'Mowing', 'Chain', 4, 2, null),
  ('Cadena motosierra 61/44 (poste)', 'Mowing', 'Chain', 3, 2, null),
  ('Bujía / Spark Plug — Kohler 4006', 'Mowing', 'Ea', 3, null, 'Qty is a best guess from a messy row on the original sheet — double check this one in the app');

-- Done. Open the app → Inventory & Parts. You'll see both divisions fully
-- populated with today's real counts and reorder points. From here on,
-- updating a count takes 10 seconds and logs itself automatically.
