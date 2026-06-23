// Shared helpers used across pages

export function money(n) {
  if (n === null || n === undefined || n === '') return '$0.00'
  const num = Number(n)
  if (Number.isNaN(num)) return '$0.00'
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d + (typeof d === 'string' && d.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtDateShort(d) {
  if (!d) return '—'
  const dt = new Date(d + (typeof d === 'string' && d.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Inventory status off on-hand vs reorder point
export function partStatus(part) {
  const onHand = Number(part.on_hand ?? 0)
  const reorder = Number(part.reorder_point ?? 0)
  if (onHand <= 0) return 'out'
  if (onHand <= reorder) return 'low'
  return 'stocked'
}

export const PART_STATUS_LABEL = { out: 'Out of Stock', low: 'Low — Reorder', stocked: 'Stocked' }

export function calcRepairTotal({ our_labor_cost, parts_cost, shop_labor_cost }) {
  const a = Number(our_labor_cost ?? 0)
  const b = Number(parts_cost ?? 0)
  const c = Number(shop_labor_cost ?? 0)
  return Math.round((a + b + c) * 100) / 100
}

export function calcLaborCost(timeMinutes, ratePerHour) {
  const mins = Number(timeMinutes ?? 0)
  const rate = Number(ratePerHour ?? 0)
  if (!mins || !rate) return 0
  return Math.round((mins / 60) * rate * 100) / 100
}

export const EQUIPMENT_TYPES = [
  'Mower', 'Weed Eater', 'Blower', 'Edger', 'Hedge Trimmer', 'Chainsaw',
  'Spreader', 'Spray Tank', 'Truck', 'Trailer', 'Other'
]

export const REPAIR_TYPES = [
  'Filter', 'Belt', 'Carburetor', 'Blade', 'Spark Plug', 'Spindle',
  'Tire', 'Tune-Up', 'Oil Change', 'Electrical', 'Other'
]

// FWC chemical application math — mirrors the "June Tracker" sheet formula:
// rounded sq ft = CEILING(scheduled, 1000); suggested gallons = (rounded/1000) * rate
export function ceilingTo1000(sqft) {
  const n = Number(sqft ?? 0)
  if (!n) return 0
  return Math.ceil(n / 1000) * 1000
}

export function suggestedGallons(roundedSqft, ratePer1000) {
  const r = Number(roundedSqft ?? 0)
  const rate = Number(ratePer1000 ?? 2)
  if (!r) return 0
  return Math.round((r / 1000) * rate * 100) / 100
}

// How far off actual was from suggested, as a status for quick visual flagging
export function fwcVariance(actual, suggested) {
  if (actual === null || actual === undefined || actual === '') return null
  const a = Number(actual)
  const s = Number(suggested)
  if (!s) return null
  const pct = (a - s) / s
  if (pct > 0.1) return 'over'
  if (pct < -0.1) return 'under'
  return 'ontarget'
}

export const ORDER_CATEGORIES = ['FWC Chemical', 'Online/General']
export const ORDER_STATUSES = ['Ordered', 'In Transit', 'Backordered', 'Received']

// Module access control — superadmin/admin always see everything regardless;
// this list only restricts what a 'crew' user sees in the nav and can route to.
export const MODULES = [
  { key: 'equipment', label: 'All Equipment' },
  { key: 'repairs', label: 'Repair Log' },
  { key: 'shop_status', label: 'Shop Status' },
  { key: 'hours', label: 'Mower Hours' },
  { key: 'inventory', label: 'Inventory & Parts' },
  { key: 'checkout', label: 'Checkout Log' },
  { key: 'fwc', label: 'FWC Tracker' },
  { key: 'orders', label: 'Orders' },
  { key: 'fleet', label: 'Fleet' },
]
