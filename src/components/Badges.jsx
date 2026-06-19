import { PART_STATUS_LABEL } from '../lib/helpers'

export function ShopTag({ children }) {
  return <span className="shop-tag">{children}</span>
}

const EQUIPMENT_STATUS_CLASS = { Active: 'badge-active', 'In Repair': 'badge-repair', Retired: 'badge-retired' }
const REPAIR_STATUS_CLASS = {
  Completed: 'badge-completed', 'At Shop': 'badge-shop',
  'Waiting on Parts': 'badge-waiting', 'In Progress': 'badge-progress',
}
const PART_STATUS_CLASS = { stocked: 'badge-stocked', low: 'badge-low', out: 'badge-out' }

export function EquipmentStatusBadge({ status }) {
  return <span className={`badge ${EQUIPMENT_STATUS_CLASS[status] || 'badge-neutral'}`}>{status}</span>
}

export function RepairStatusBadge({ status }) {
  return <span className={`badge ${REPAIR_STATUS_CLASS[status] || 'badge-neutral'}`}>{status}</span>
}

export function PartStatusBadge({ statusKey }) {
  return <span className={`badge ${PART_STATUS_CLASS[statusKey] || 'badge-neutral'}`}>{PART_STATUS_LABEL[statusKey]}</span>
}

export function EmptyState({ icon, title, sub }) {
  return (
    <div className="empty-state">
      {icon}
      <h4>{title}</h4>
      {sub && <p className="text-sm">{sub}</p>}
    </div>
  )
}
