import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Wrench, Plus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { money, fmtDate, todayISO, costPerMile, expiryStatus } from '../lib/helpers'
import { EquipmentStatusBadge, EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const BLANK_REPAIR = { date: todayISO(), description: '', amount: '', invoice_number: '', mileage: '', status: 'Completed', notes: '' }

export default function FleetVehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [vehicle, setVehicle] = useState(null)
  const [repairs, setRepairs] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [repairModalOpen, setRepairModalOpen] = useState(false)
  const [editRepairId, setEditRepairId] = useState(null)
  const [repairForm, setRepairForm] = useState(BLANK_REPAIR)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: v } = await supabase.from('fleet_vehicles').select('*').eq('id', id).single()
    setVehicle(v); setForm(v)
    const { data: r } = await supabase.from('fleet_repairs').select('*').eq('vehicle_id', id).order('date', { ascending: false })
    setRepairs(r || [])
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('fleet_vehicles').update({
      nickname: form.nickname, year: form.year, make: form.make, model: form.model,
      crew_assigned: form.crew_assigned, license_plate: form.license_plate, vin: form.vin,
      status: form.status, notes: form.notes,
      registration_expiry: form.registration_expiry || null,
      insurance_expiry: form.insurance_expiry || null,
      next_service_mileage: form.next_service_mileage === '' ? null : Number(form.next_service_mileage),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setSaving(false); setEditing(false); load()
  }

  async function handleDelete() {
    if (!window.confirm('Delete this vehicle? This cannot be undone.')) return
    await supabase.from('fleet_vehicles').delete().eq('id', id)
    navigate('/fleet')
  }

  async function handleDeleteRepair(repairId) {
    if (!window.confirm('Delete this repair entry? This cannot be undone.')) return
    await supabase.from('fleet_repairs').delete().eq('id', repairId)
    setRepairModalOpen(false)
    load()
  }

  function openAddRepair() { setRepairForm({ ...BLANK_REPAIR, mileage: vehicle?.current_mileage ?? '' }); setEditRepairId(null); setRepairModalOpen(true) }
  function openEditRepair(r) {
    setRepairForm({
      date: r.date, description: r.description, amount: r.amount ?? '', invoice_number: r.invoice_number || '',
      mileage: r.mileage ?? '', status: r.status, notes: r.notes || '',
    })
    setEditRepairId(r.id); setRepairModalOpen(true)
  }

  async function handleSaveRepair(e) {
    e.preventDefault()
    setSaving(true)
    if (editRepairId) {
      await supabase.from('fleet_repairs').update({
        date: repairForm.date, description: repairForm.description,
        amount: repairForm.amount === '' ? null : Number(repairForm.amount),
        invoice_number: repairForm.invoice_number || null,
        mileage: repairForm.mileage === '' ? null : Number(repairForm.mileage),
        status: repairForm.status, notes: repairForm.notes || null, updated_at: new Date().toISOString(),
      }).eq('id', editRepairId)
    } else {
      await supabase.rpc('log_fleet_repair', {
        p_vehicle_id: id, p_date: repairForm.date, p_description: repairForm.description,
        p_amount: repairForm.amount === '' ? null : Number(repairForm.amount),
        p_invoice_number: repairForm.invoice_number || null,
        p_mileage: repairForm.mileage === '' ? null : Number(repairForm.mileage),
        p_status: repairForm.status, p_notes: repairForm.notes || null, p_created_by: user?.name || null,
      })
    }
    setSaving(false); setRepairModalOpen(false); load()
  }

  if (!vehicle) return <p className="text-muted">Loading…</p>

  const totalCost = repairs.reduce((s, r) => s + Number(r.amount || 0), 0)
  const cpm = costPerMile(totalCost, vehicle.current_mileage)
  const regStatus = expiryStatus(vehicle.registration_expiry)
  const insStatus = expiryStatus(vehicle.insurance_expiry)
  const serviceDue = vehicle.next_service_mileage && vehicle.current_mileage
    && Number(vehicle.current_mileage) >= Number(vehicle.next_service_mileage)

  const fleetRepairGroups = (() => {
    const map = new Map()
    for (const r of repairs) {
      const key = r.date ? new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'No date'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    return [...map.entries()]
  })()

  return (
    <div>
      <button className="btn btn-ghost btn-sm mb-16" onClick={() => navigate('/fleet')}><ArrowLeft size={14} /> Back to Fleet</button>

      <div className="card card-pad mb-16">
        <div className="flex justify-between items-center mb-16">
          <div>
            <div className="flex items-center gap-10">
              <h2>{vehicle.year} {vehicle.make} {vehicle.model}</h2>
              <EquipmentStatusBadge status={vehicle.status} />
            </div>
            <p className="text-sm text-muted mt-6">{vehicle.nickname}</p>
          </div>
          {isAdmin && !editing && (
            <div className="flex gap-10">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={14} /></button>
            </div>
          )}
        </div>

        {(serviceDue || regStatus === 'expired' || regStatus === 'soon' || insStatus === 'expired' || insStatus === 'soon') && !editing && (
          <div className="vehicle-card-flags mb-16">
            {serviceDue && <span className="badge badge-low">Service Due — over {Number(vehicle.next_service_mileage).toLocaleString()} mi</span>}
            {regStatus === 'expired' && <span className="badge badge-out">Registration Expired</span>}
            {regStatus === 'soon' && <span className="badge badge-low">Registration Expiring ({fmtDate(vehicle.registration_expiry)})</span>}
            {insStatus === 'expired' && <span className="badge badge-out">Insurance Expired</span>}
            {insStatus === 'soon' && <span className="badge badge-low">Insurance Expiring ({fmtDate(vehicle.insurance_expiry)})</span>}
          </div>
        )}

        {!editing ? (
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <div className="kpi-card"><div className="kpi-label">Crew</div><div className="kpi-value" style={{ fontSize: '1.1rem' }}>{vehicle.crew_assigned || '—'}</div></div>
            <div className="kpi-card"><div className="kpi-label">Current Mileage</div><div className="kpi-value" style={{ fontSize: '1.3rem' }}>{vehicle.current_mileage ? Number(vehicle.current_mileage).toLocaleString() : '—'}</div></div>
            <div className="kpi-card"><div className="kpi-label">Total Repair Cost</div><div className="kpi-value">{money(totalCost)}</div></div>
            <div className="kpi-card"><div className="kpi-label">Cost / Mile</div><div className="kpi-value" style={{ fontSize: '1.3rem' }}>{cpm !== null ? `$${cpm.toFixed(2)}` : '—'}</div></div>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="modal-section-label">The Vehicle</div>
            <div className="field"><label>Nickname</label>
              <input value={form.nickname || ''} onChange={e => setForm({ ...form, nickname: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field"><label>Year</label>
                <input value={form.year || ''} onChange={e => setForm({ ...form, year: e.target.value })} />
              </div>
              <div className="field"><label>Crew Assigned</label>
                <input value={form.crew_assigned || ''} onChange={e => setForm({ ...form, crew_assigned: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Make</label>
                <input value={form.make || ''} onChange={e => setForm({ ...form, make: e.target.value })} />
              </div>
              <div className="field"><label>Model</label>
                <input value={form.model || ''} onChange={e => setForm({ ...form, model: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>License Plate</label>
                <input value={form.license_plate || ''} onChange={e => setForm({ ...form, license_plate: e.target.value })} />
              </div>
              <div className="field"><label>VIN</label>
                <input value={form.vin || ''} onChange={e => setForm({ ...form, vin: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {['Active', 'In Repair', 'Retired'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="modal-section-label">Compliance &amp; Service</div>
            <div className="field-row">
              <div className="field"><label>Registration Expires</label>
                <input type="date" value={form.registration_expiry || ''} onChange={e => setForm({ ...form, registration_expiry: e.target.value })} />
              </div>
              <div className="field"><label>Insurance Expires</label>
                <input type="date" value={form.insurance_expiry || ''} onChange={e => setForm({ ...form, insurance_expiry: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>Next Service Due (mileage)</label>
              <input type="number" min="0" value={form.next_service_mileage ?? ''} onChange={e => setForm({ ...form, next_service_mileage: e.target.value })} placeholder="Optional — e.g. 185000" />
            </div>
            <div className="field"><label>Notes</label>
              <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => { setEditing(false); setForm(vehicle) }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        )}

        {vehicle.notes && !editing && <p className="text-sm text-muted mt-16">Note: {vehicle.notes}</p>}
      </div>

      <div className="card card-pad">
        <div className="flex justify-between items-center mb-16">
          <span className="section-title"><Wrench size={17} /> Repair History</span>
          <button className="btn btn-gold btn-sm" onClick={openAddRepair}><Plus size={14} /> Log Repair</button>
        </div>

        {repairs.length === 0 ? (
          <EmptyState icon={<Wrench size={32} />} title="No repairs logged yet" sub="Add the first one for this vehicle." />
        ) : (
          fleetRepairGroups.map(([month, items]) => (
            <div key={month} className="mb-16">
              <div className="text-xs text-muted mb-6" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>{month}</div>
              {items.map(r => (
                <div className="feed-card" key={r.id} onClick={() => openEditRepair(r)}>
                  <div className={`feed-icon ${r.status === 'Completed' ? 'diy' : 'shop'}`}><Wrench size={17} /></div>
                  <div className="feed-body">
                    <div className="feed-title-row">
                      <div>
                        <div className="feed-title">{r.description}</div>
                        <div className="feed-meta">
                          <span>{fmtDate(r.date)}</span>
                          {r.mileage && <span>Mileage <b>{Number(r.mileage).toLocaleString()}</b></span>}
                          {r.invoice_number && <span>Invoice <b>{r.invoice_number}</b></span>}
                        </div>
                      </div>
                      <div className="feed-right">
                        <span className={`badge ${r.status === 'Completed' ? 'badge-completed' : 'badge-progress'}`}>{r.status}</span>
                        <span className="feed-cost">{money(r.amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {repairModalOpen && (
        <Modal title={editRepairId ? 'Edit Repair' : 'Log Repair'} onClose={() => setRepairModalOpen(false)}>
          <form onSubmit={handleSaveRepair}>
            <div className="modal-section-label">What Happened</div>
            <div className="field-row">
              <div className="field"><label>Date</label>
                <input type="date" value={repairForm.date} onChange={e => setRepairForm({ ...repairForm, date: e.target.value })} required />
              </div>
              <div className="field"><label>Status</label>
                <select value={repairForm.status} onChange={e => setRepairForm({ ...repairForm, status: e.target.value })}>
                  <option value="Completed">Completed</option>
                  <option value="Scheduled">Scheduled</option>
                </select>
              </div>
            </div>
            <div className="field"><label>Repair / Description</label>
              <input value={repairForm.description} onChange={e => setRepairForm({ ...repairForm, description: e.target.value })} required autoFocus />
            </div>

            <div className="modal-section-label">Cost &amp; Mileage</div>
            <div className="field-row">
              <div className="field"><label>Amount ($)</label>
                <input type="number" min="0" step="0.01" value={repairForm.amount} onChange={e => setRepairForm({ ...repairForm, amount: e.target.value })} />
              </div>
              <div className="field"><label>Invoice #</label>
                <input value={repairForm.invoice_number} onChange={e => setRepairForm({ ...repairForm, invoice_number: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>Mileage</label>
              <input type="number" min="0" value={repairForm.mileage} onChange={e => setRepairForm({ ...repairForm, mileage: e.target.value })} />
            </div>
            <div className="field"><label>Notes</label>
              <textarea value={repairForm.notes} onChange={e => setRepairForm({ ...repairForm, notes: e.target.value })} placeholder="Optional" />
            </div>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setRepairModalOpen(false)}>Cancel</button>
              <div className="flex gap-10">
                {editRepairId && (
                  <button type="button" className="btn btn-danger" onClick={() => handleDeleteRepair(editRepairId)}><Trash2 size={14} /> Delete</button>
                )}
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : (editRepairId ? 'Save Changes' : 'Log Repair')}</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
