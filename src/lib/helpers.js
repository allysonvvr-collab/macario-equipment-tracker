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
