import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PackageX, Wrench, ArrowRight, ClipboardList, Package2, Plus, Clock, ShoppingCart, LayoutDashboard } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { money, fmtDateShort, fmtDate, partStatus } from '../lib/helpers'
import { RepairStatusBadge, PartStatusBadge, OrderStatusBadge } from '../components/Badges'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const { canAccess } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ activeCount: 0, inRepairCount: 0, monthSpend: 0 })
  const [atShop, setAtShop] = useState([])
  const [lowParts, setLowParts] = useState([])
  const [recentRepairs, setRecentRepairs] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])

  const canEquipment = canAccess('equipment')
  const canRepairs = canAccess('repairs')
  const canShop = canAccess('shop_status')
  const canInventory = canAccess('inventory')
  const canOrders = canAccess('orders')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const monthStart = new Date(); monthStart.setDate(1)
    const monthStartISO = monthStart.toISOString().slice(0, 10)

    const [activeRes, inRepairRes, monthRepairsRes, shopRes, partsRes, recentRes, ordersRes] = await Promise.all([
      canEquipment ? supabase.from('equipment').select('id', { count: 'exact', head: true }).eq('status', 'Active') : Promise.resolve({ count: 0 }),
      canEquipment ? supabase.from('equipment').select('id', { count: 'exact', head: true }).eq('status', 'In Repair') : Promise.resolve({ count: 0 }),
      canRepairs ? supabase.from('repair_log').select('total_cost').gte('date', monthStartISO) : Promise.resolve({ data: [] }),
      canShop ? supabase.from('repair_log').select('*').in('status', ['At Shop', 'Waiting on Parts']).order('date_sent_to_shop', { ascending: true }) : Promise.resolve({ data: [] }),
      canInventory ? supabase.from('parts_catalog').select('*').eq('active', true) : Promise.resolve({ data: [] }),
      canRepairs ? supabase.from('repair_log').select('*').order('date', { ascending: false }).limit(6) : Promise.resolve({ data: [] }),
      canOrders ? supabase.from('orders').select('*').neq('status', 'Received').order('expected_date', { ascending: true }).limit(4) : Promise.resolve({ data: [] }),
    ])

    const monthSpend = (monthRepairsRes.data || []).reduce((s, r) => s + Number(r.total_cost || 0), 0)
    const low = (partsRes.data || []).filter(p => partStatus(p) !== 'stocked').sort(a => partStatus(a) === 'out' ? -1 : 1)

    setStats({ activeCount: activeRes.count || 0, inRepairCount: inRepairRes.count || 0, monthSpend })
    setAtShop(shopRes.data || [])
    setLowParts(low.slice(0, 6))
    setRecentRepairs(recentRes.data || [])
    setPendingOrders(ordersRes.data || [])
    setLoading(false)
  }

  if (loading) return <p className="text-muted">Loading…</p>

  const quickActions = [
    { module: 'repairs', label: 'Log Repair', icon: Wrench, to: '/repairs?new=1' },
    { module: 'hours', label: 'Log Mower Hours', icon: Clock, to: '/hours' },
    { module: 'orders', label: 'Add Order', icon: ShoppingCart, to: '/orders?new=1' },
    { module: 'inventory', label: 'Update Inventory Count', icon: Package2, to: '/inventory' },
  ].filter(a => canAccess(a.module))

  const kpis = [
    canEquipment && { label: 'Active Equipment', value: stats.activeCount, sub: 'across all crews' },
    canEquipment && { label: 'In Repair', value: stats.inRepairCount, sub: 'down right now', warn: stats.inRepairCount > 0 },
    canShop && { label: 'At Shop', value: atShop.length, sub: 'waiting on the mechanic', warn: atShop.length > 0 },
    canInventory && { label: 'Parts Low / Out', value: lowParts.length, sub: 'need reordering', alert: lowParts.length > 0 },
  ].filter(Boolean)

  const anyPanel = canRepairs || canShop || canInventory || canOrders

  return (
    <div>
      {quickActions.length > 0 && (
        <div className="quick-actions">
          {quickActions.map(a => (
            <button key={a.to} className="quick-action-btn" onClick={() => navigate(a.to)}>
              <Plus size={14} /> <a.icon size={15} /> {a.label}
            </button>
          ))}
        </div>
      )}

      {kpis.length > 0 && (
        <div className="kpi-grid">
          {kpis.map(k => (
            <div className={`kpi-card ${k.alert ? 'alert' : k.warn ? 'warn' : ''}`} key={k.label}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-sub">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {!anyPanel && (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <LayoutDashboard size={32} style={{ color: 'var(--gray-300)', marginBottom: 10 }} />
          <p className="text-muted text-sm">Nothing to show here yet — check the sidebar for what you have access to.</p>
        </div>
      )}

      {anyPanel && (
        <div style={{ display: 'grid', gridTemplateColumns: canRepairs ? '1.3fr 1fr' : '1fr', gap: 16 }} className="dash-grid">
          {canRepairs && (
            <div className="card card-pad">
              <div className="flex justify-between items-center mb-16">
                <span className="section-title"><Wrench size={17} /> Recent Repairs</span>
                <Link to="/repairs" className="btn btn-ghost btn-sm">View all <ArrowRight size={14} /></Link>
              </div>
              {recentRepairs.length === 0 ? (
                <p className="text-muted text-sm">No repairs logged yet.</p>
              ) : (
                <div className="card-list">
                  {recentRepairs.map(r => (
                    <div className="row-card" key={r.id}>
                      <div className="row-card-top">
                        <b>{r.type}{r.serial_last4 ? ` · #${r.serial_last4}` : ''} — {r.repair_type}</b>
                        <RepairStatusBadge status={r.status} />
                      </div>
                      <div className="row-card-line"><span>Crew / By</span><b>{r.crew || '—'} · {r.performed_by || '—'}</b></div>
                      <div className="row-card-line"><span>Date</span><b>{fmtDateShort(r.date)}</b></div>
                      <div className="row-card-line"><span>Total Cost</span><b>{money(r.total_cost)}</b></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(canShop || canInventory || canOrders) && (
            <div className="flex-col gap-14">
              {canShop && (
                <div className="card card-pad">
                  <div className="flex justify-between items-center mb-16">
                    <span className="section-title"><ClipboardList size={17} /> At Shop</span>
                    <Link to="/shop-status" className="btn btn-ghost btn-sm">All <ArrowRight size={14} /></Link>
                  </div>
                  {atShop.length === 0 ? (
                    <p className="text-muted text-sm">Nothing out at a shop right now.</p>
                  ) : (
                    <div className="card-list">
                      {atShop.slice(0, 4).map(r => (
                        <div className="row-card" key={r.id}>
                          <div className="row-card-top">
                            <b>{r.type} #{r.serial_last4 || '—'}</b>
                            <RepairStatusBadge status={r.status} />
                          </div>
                          <div className="row-card-line"><span>Shop</span><b>{r.shop_name || '—'}</b></div>
                          <div className="row-card-line"><span>Sent</span><b>{fmtDateShort(r.date_sent_to_shop)}</b></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {canInventory && (
                <div className="card card-pad">
                  <div className="flex justify-between items-center mb-16">
                    <span className="section-title"><PackageX size={17} /> Low / Out of Stock</span>
                    <Link to="/inventory" className="btn btn-ghost btn-sm">All <ArrowRight size={14} /></Link>
                  </div>
                  {lowParts.length === 0 ? (
                    <p className="text-muted text-sm">Inventory looks good.</p>
                  ) : (
                    <div className="card-list">
                      {lowParts.map(p => (
                        <div className="row-card" key={p.id}>
                          <div className="row-card-top">
                            <b>{p.part_name}</b>
                            <PartStatusBadge statusKey={partStatus(p)} />
                          </div>
                          <div className="row-card-line"><span>On hand</span><b>{p.on_hand} (reorder at {p.reorder_point})</b></div>
                          <div className="row-card-line"><span>Division</span><b>{p.division}</b></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {canOrders && (
                <div className="card card-pad">
                  <div className="flex justify-between items-center mb-16">
                    <span className="section-title"><Package2 size={17} /> Pending Orders</span>
                    <Link to="/orders" className="btn btn-ghost btn-sm">All <ArrowRight size={14} /></Link>
                  </div>
                  {pendingOrders.length === 0 ? (
                    <p className="text-muted text-sm">Nothing on order right now.</p>
                  ) : (
                    <div className="card-list">
                      {pendingOrders.map(o => (
                        <div className="row-card" key={o.id}>
                          <div className="row-card-top"><b>{o.product}</b><OrderStatusBadge status={o.status} /></div>
                          <div className="row-card-line"><span>Vendor</span><b>{o.vendor || '—'}</b></div>
                          <div className="row-card-line"><span>Expected</span><b>{fmtDate(o.expected_date)}</b></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 980px) { .dash-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
