import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Truck, Search, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { money, costPerMile, expiryStatus } from '../lib/helpers'
import { EquipmentStatusBadge, EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'

const BLANK = {
  nickname: '', year: '', make: '', model: '', crew_assigned: '', license_plate: '', vin: '',
  status: 'Active', registration_expiry: '', insurance_expiry: '', next_service_mileage: '', notes: '',
}

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
    await supabase.from('fleet_vehicles').insert([{
      ...form,
      registration_expiry: form.registration_expiry || null,
      insurance_expiry: form.insurance_expiry || null,
      next_service_mileage: form.next_service_mileage === '' ? null : Number(form.next_service_mileage),
    }])
    setSaving(false); setModalOpen(false); load()
  }

  async function handleDelete(e, v) {
    e.stopPropagation()
    if (!window.confirm(`Delete ${v.year} ${v.make} ${v.model}? This removes its whole repair history too.`)) return
    await supabase.from('fleet_vehicles').delete().eq('id', v.id)
    load()
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
        <div className="vehicle-grid">
          {filtered.map(v => {
            const t = totals[v.id] || { cost: 0, count: 0 }
            const cpm = costPerMile(t.cost, v.current_mileage)
            const regStatus = expiryStatus(v.registration_expiry)
            const insStatus = expiryStatus(v.insurance_expiry)
            const serviceDue = v.next_service_mileage && v.current_mileage && Number(v.current_mileage) >= Number(v.next_service_mileage)
            return (
              <div className="vehicle-card" key={v.id} onClick={() => navigate(`/fleet/${v.id}`)}>
                <button className="vehicle-card-delete" onClick={(e) => handleDelete(e, v)} title="Delete vehicle"><Trash2 size={13} /></button>
                <div className="vehicle-card-top">
                  <div className="vehicle-card-icon"><Truck size={20} /></div>
                  <div>
                    <div className="vehicle-card-title">{v.year} {v.make} {v.model}</div>
                    <div className="vehicle-card-sub">{v.nickname}{v.crew_assigned ? ` · ${v.crew_assigned}` : ''}</div>
                  </div>
                </div>

                <EquipmentStatusBadge status={v.status} />

                <div className="vehicle-card-stats">
                  <div className="vehicle-stat">
                    <div className="vehicle-stat-label">Mileage</div>
                    <div className="vehicle-stat-value">{v.current_mileage ? Number(v.current_mileage).toLocaleString() : '—'}</div>
                  </div>
                  <div className="vehicle-stat">
                    <div className="vehicle-stat-label">Cost / Mile</div>
                    <div className="vehicle-stat-value">{cpm !== null ? `$${cpm.toFixed(2)}` : '—'}</div>
                  </div>
                  <div className="vehicle-stat">
                    <div className="vehicle-stat-label">Total Cost</div>
                    <div className="vehicle-stat-value">{money(t.cost)}</div>
                  </div>
                  <div className="vehicle-stat">
                    <div className="vehicle-stat-label">Repairs</div>
                    <div className="vehicle-stat-value">{t.count}</div>
                  </div>
                </div>

                {(serviceDue || regStatus === 'expired' || regStatus === 'soon' || insStatus === 'expired' || insStatus === 'soon') && (
                  <div className="vehicle-card-flags">
                    {serviceDue && <span className="badge badge-low">Service Due</span>}
                    {regStatus === 'expired' && <span className="badge badge-out">Reg. Expired</span>}
                    {regStatus === 'soon' && <span className="badge badge-low">Reg. Expiring</span>}
                    {insStatus === 'expired' && <span className="badge badge-out">Insurance Expired</span>}
                    {insStatus === 'soon' && <span className="badge badge-low">Insurance Expiring</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <Modal title="Add Vehicle" onClose={() => setModalOpen(false)} width="560px">
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
            <div className="field-row">
              <div className="field"><label>Registration Expires</label>
                <input type="date" value={form.registration_expiry} onChange={e => setForm({ ...form, registration_expiry: e.target.value })} />
              </div>
              <div className="field"><label>Insurance Expires</label>
                <input type="date" value={form.insurance_expiry} onChange={e => setForm({ ...form, insurance_expiry: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>Next Service Due (mileage)</label>
              <input type="number" min="0" value={form.next_service_mileage} onChange={e => setForm({ ...form, next_service_mileage: e.target.value })} placeholder="Optional — e.g. 185000" />
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
