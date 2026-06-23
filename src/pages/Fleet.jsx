import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Truck, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { money } from '../lib/helpers'
import { EquipmentStatusBadge, EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'

const BLANK = { nickname: '', year: '', make: '', model: '', crew_assigned: '', license_plate: '', vin: '', status: 'Active', notes: '' }

export default function Fleet() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState([])
  const [totals, setTotals] = useState({}) // vehicle_id -> { cost, count }
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: v }, { data: r }] = await Promise.all([
      supabase.from('fleet_vehicles').select('*').order('crew_assigned'),
      supabase.from('fleet_repairs').select('vehicle_id, amount'),
    ])
    const t = {}
    for (const row of (r || [])) {
      if (!t[row.vehicle_id]) t[row.vehicle_id] = { cost: 0, count: 0 }
      t[row.vehicle_id].cost += Number(row.amount || 0)
      t[row.vehicle_id].count += 1
    }
    setVehicles(v || [])
    setTotals(t)
    setLoading(false)
  }

  const filtered = vehicles.filter(v => {
    if (!search) return true
    const s = search.toLowerCase()
    return `${v.nickname} ${v.year} ${v.make} ${v.model} ${v.crew_assigned}`.toLowerCase().includes(s)
  })

  function openAdd() { setForm(BLANK); setModalOpen(true) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('fleet_vehicles').insert([form])
    setSaving(false); setModalOpen(false); load()
  }

  return (
    <div>
      <p className="text-sm text-muted mb-16">Every truck, its repair history, and running cost — same idea as Equipment, just for the fleet.</p>

      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={15} />
          <input type="text" placeholder="Search nickname, make, model, crew…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="spacer" />
        <button className="btn btn-gold" onClick={openAdd}><Plus size={15} /> Add Vehicle</button>
      </div>

      {loading ? <p className="text-muted">Loading…</p> : filtered.length === 0 ? (
        <EmptyState icon={<Truck size={36} />} title="No vehicles found" sub="Add a truck to start tracking its repairs." />
      ) : (
        <>
          <div className="table-wrap hide-mobile">
            <table className="data-table">
              <thead>
                <tr><th>Vehicle</th><th>Crew</th><th>Mileage</th><th>Status</th><th>Repairs</th><th>Total Cost</th></tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const t = totals[v.id] || { cost: 0, count: 0 }
                  return (
                    <tr key={v.id} className="clickable" onClick={() => navigate(`/fleet/${v.id}`)}>
                      <td className="cell-strong">{v.year} {v.make} {v.model}<div className="text-xs text-muted">{v.nickname}</div></td>
                      <td>{v.crew_assigned || '—'}</td>
                      <td className="cell-muted">{v.current_mileage ? Number(v.current_mileage).toLocaleString() : '—'}</td>
                      <td><EquipmentStatusBadge status={v.status} /></td>
                      <td className="cell-muted">{t.count}</td>
                      <td className="cell-strong">{money(t.cost)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="card-list show-mobile">
            {filtered.map(v => {
              const t = totals[v.id] || { cost: 0, count: 0 }
              return (
                <div className="row-card" key={v.id} onClick={() => navigate(`/fleet/${v.id}`)}>
                  <div className="row-card-top"><b>{v.year} {v.make} {v.model}</b><EquipmentStatusBadge status={v.status} /></div>
                  <div className="row-card-line"><span>Crew</span><b>{v.crew_assigned || '—'}</b></div>
                  <div className="row-card-line"><span>Mileage</span><b>{v.current_mileage ? Number(v.current_mileage).toLocaleString() : '—'}</b></div>
                  <div className="row-card-line"><span>Total Cost</span><b>{money(t.cost)} ({t.count} repairs)</b></div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {modalOpen && (
        <Modal title="Add Vehicle" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave}>
            <div className="field"><label>Nickname</label>
              <input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="e.g. FWC1 Truck" required />
            </div>
            <div className="field-row">
              <div className="field"><label>Year</label>
                <input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
              </div>
              <div className="field"><label>Crew Assigned</label>
                <input value={form.crew_assigned} onChange={e => setForm({ ...form, crew_assigned: e.target.value })} placeholder="FWC1, MC2…" />
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Make</label>
                <input value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} />
              </div>
              <div className="field"><label>Model</label>
                <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>License Plate</label>
                <input value={form.license_plate} onChange={e => setForm({ ...form, license_plate: e.target.value })} />
              </div>
              <div className="field"><label>VIN</label>
                <input value={form.vin} onChange={e => setForm({ ...form, vin: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {['Active', 'In Repair', 'Retired'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field"><label>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Vehicle'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
