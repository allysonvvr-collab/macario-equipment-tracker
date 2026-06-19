import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageX, Wrench, ArrowRight, ClipboardList } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { money, fmtDateShort, partStatus } from '../lib/helpers'
import { RepairStatusBadge, PartStatusBadge } from '../components/Badges'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ activeCount: 0, inRepairCount: 0, monthSpend: 0 })
  const [atShop, setAtShop] = useState([])
  const [lowParts, setLowParts] = useState([])
  const [recentRepairs, setRecentRepairs] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const monthStart = new Date(); monthStart.setDate(1)
    const monthStartISO = monthStart.toISOString().slice(0, 10)

    const [{ count: active }, { count: inRepair }, { data: monthRepairs },
      { data: shopRows }, { data: parts }, { data: recent }] = await Promise.all([
      supabase.from('equipment').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('equipment').select('id', { count: 'exact', head: true }).eq('status', 'In Repair'),
      supabase.from('repair_log').select('total_cost').gte('date', monthStartISO),
      supabase.from('repair_log').select('*').in('status', ['At Shop', 'Waiting on Parts']).order('date_sent_to_shop', { ascending: true }),
      supabase.from('parts_catalog').select('*').eq('active', true),
      supabase.from('repair_log').select('*').order('date', { ascending: false }).limit(6),
    ])

    const monthSpend = (monthRepairs || []).reduce((s, r) => s + Number(r.total_cost || 0), 0)
    const low = (parts || []).filter(p => partStatus(p) !== 'stocked').sort(a => partStatus(a) === 'out' ? -1 : 1)

    setStats({ activeCount: active || 0, inRepairCount: inRepair || 0, monthSpend })
    setAtShop(shopRows || [])
    setLowParts(low.slice(0, 6))
    setRecentRepairs(recent || [])
    setLoading(false)
  }

  if (loading) return <p className="text-muted">Loading…</p>

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Active Equipment</div>
          <div className="kpi-value">{stats.activeCount}</div>
          <div className="kpi-sub">across all crews</div>
        </div>
        <div className={`kpi-card ${stats.inRepairCount > 0 ? 'warn' : ''}`}>
          <div className="kpi-label">In Repair</div>
          <div className="kpi-value">{stats.inRepairCount}</div>
          <div className="kpi-sub">down right now</div>
        </div>
        <div className={`kpi-card ${atShop.length > 0 ? 'warn' : ''}`}>
          <div className="kpi-label">At Shop</div>
          <div className="kpi-value">{atShop.length}</div>
          <div className="kpi-sub">waiting on the mechanic</div>
        </div>
        <div className={`kpi-card ${lowParts.length > 0 ? 'alert' : ''}`}>
          <div className="kpi-label">Parts Low / Out</div>
          <div className="kpi-value">{lowParts.length}</div>
          <div className="kpi-sub">need reordering</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }} className="dash-grid">
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

        <div className="flex-col gap-14">
          <div className="card card-pad">
            <div className="flex justify-between items-center mb-16">
              <span className="section-title"><ClipboardList size={17} /> At Shop</span>
              <Link to="/shop-status" className="btn btn-ghost btn-sm">All <ArrowRight size={14} /></Link>
            </div>
            {atShop.length === 0 ? (
              <p className="text-muted text-sm">Nothing out at a shop right now. 🎉</p>
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

          <div className="card card-pad">
            <div className="flex justify-between items-center mb-16">
              <span className="section-title"><PackageX size={17} /> Low / Out of Stock</span>
              <Link to="/inventory" className="btn btn-ghost btn-sm">All <ArrowRight size={14} /></Link>
            </div>
            {lowParts.length === 0 ? (
              <p className="text-muted text-sm">Inventory looks good. ✅</p>
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
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) { .dash-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
