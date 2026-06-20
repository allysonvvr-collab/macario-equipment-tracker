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
const ORDER_STATUS_CLASS = {
  Received: 'badge-completed', 'In Transit': 'badge-shop',
  Backordered: 'badge-out', Ordered: 'badge-progress',
}
const FWC_VARIANCE_CLASS = { ontarget: 'badge-stocked', over: 'badge-shop', under: 'badge-low' }
const FWC_VARIANCE_LABEL = { ontarget: 'On Target', over: 'Over', under: 'Under' }

export function EquipmentStatusBadge({ status }) {
  return <span className={`badge ${EQUIPMENT_STATUS_CLASS[status] || 'badge-neutral'}`}>{status}</span>
}

export function RepairStatusBadge({ status }) {
  return <span className={`badge ${REPAIR_STATUS_CLASS[status] || 'badge-neutral'}`}>{status}</span>
}

export function PartStatusBadge({ statusKey }) {
  return <span className={`badge ${PART_STATUS_CLASS[statusKey] || 'badge-neutral'}`}>{PART_STATUS_LABEL[statusKey]}</span>
}

export function OrderStatusBadge({ status }) {
  return <span className={`badge ${ORDER_STATUS_CLASS[status] || 'badge-neutral'}`}>{status}</span>
}

export function FwcVarianceBadge({ variance }) {
  if (!variance) return <span className="badge badge-neutral">Pending</span>
  return <span className={`badge ${FWC_VARIANCE_CLASS[variance] || 'badge-neutral'}`}>{FWC_VARIANCE_LABEL[variance]}</span>
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
