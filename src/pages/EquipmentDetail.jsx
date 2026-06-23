import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Wrench, Clock } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { money, fmtDate, EQUIPMENT_TYPES } from '../lib/helpers'
import { EquipmentStatusBadge, RepairStatusBadge } from '../components/Badges'
import { useAuth } from '../context/AuthContext'

export default function EquipmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [eq, setEq] = useState(null)
  const [repairs, setRepairs] = useState([])
  const [hours, setHours] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: e } = await supabase.from('equipment').select('*').eq('id', id).single()
    setEq(e); setForm(e)
    const { data: r } = await supabase.from('repair_log').select('*').eq('equipment_id', id).order('date', { ascending: false })
    setRepairs(r || [])
    const { data: h } = await supabase.from('equipment_hours_log').select('*').eq('equipment_id', id).order('log_date', { ascending: false })
    setHours(h || [])
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('equipment').update({
      type: form.type, serial_last4: form.serial_last4, serial_full: form.serial_full,
      make_model: form.make_model, division: form.division, crew_assigned: form.crew_assigned,
      status: form.status, notes: form.notes, updated_at: new Date().toISOString(),
    }).eq('id', id)
    setSaving(false)
    if (!error) { setEditing(false); load() }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this equipment? This cannot be undone.')) return
    await supabase.from('equipment').delete().eq('id', id)
    navigate('/equipment')
  }

  if (!eq) return <p className="text-muted">Loading…</p>

  const totalSpent = repairs.reduce((s, r) => s + Number(r.total_cost || 0), 0)
  const isMowerLike = ['Mower'].includes(eq.type)

  return (
    <div>
      <button className="btn btn-ghost btn-sm mb-16" onClick={() => navigate('/equipment')}><ArrowLeft size={14} /> Back to Equipment</button>

      <div className="card card-pad mb-16">
        <div className="flex justify-between items-center mb-16">
          <div>
            <div className="flex items-center gap-10">
              <h2>{eq.type} #{eq.serial_last4 || '—'}</h2>
              <EquipmentStatusBadge status={eq.status} />
            </div>
            <p className="text-sm text-muted mt-6">{eq.make_model || 'No make/model on file'}</p>
          </div>
          {isAdmin && !editing && (
            <div className="flex gap-10">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={14} /></button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <div className="kpi-card"><div className="kpi-label">Division</div><div className="kpi-value" style={{ fontSize: '1.1rem' }}>{eq.division}</div></div>
            <div className="kpi-card"><div className="kpi-label">Crew</div><div className="kpi-value" style={{ fontSize: '1.1rem' }}>{eq.crew_assigned || '—'}</div></div>
            <div className="kpi-card"><div className="kpi-label">Total Repair Cost</div><div className="kpi-value">{money(totalSpent)}</div></div>
            <div className="kpi-card"><div className="kpi-label">{isMowerLike ? 'Current Hours' : 'Repairs Logged'}</div><div className="kpi-value">{isMowerLike ? (eq.current_hours ?? '—') : repairs.length}</div></div>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="field-row">
              <div className="field"><label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field"><label>Serial (last 4)</label>
                <input value={form.serial_last4 || ''} onChange={e => setForm({ ...form, serial_last4: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>Make / Model</label>
              <input value={form.make_model || ''} onChange={e => setForm({ ...form, make_model: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field"><label>Division</label>
                <input value={form.division || ''} onChange={e => setForm({ ...form, division: e.target.value })} />
              </div>
              <div className="field"><label>Crew Assigned</label>
                <input value={form.crew_assigned || ''} onChange={e => setForm({ ...form, crew_assigned: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {['Active', 'In Repair', 'Retired'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field"><label>Notes</label>
              <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => { setEditing(false); setForm(eq) }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        )}

        {eq.notes && !editing && <p className="text-sm text-muted mt-16">Note: {eq.notes}</p>}
      </div>

      {isMowerLike && (
        <div className="card card-pad mb-16">
          <span className="section-title mb-16"><Clock size={17} /> Hours Log</span>
          {hours.length === 0 ? <p className="text-muted text-sm">No hours logged yet. Add one from the Mower Hours page.</p> : (
            hours.map(h => (
              <div className="feed-card" key={h.id} style={{ cursor: 'default' }}>
                <div className="feed-icon diy"><Clock size={17} /></div>
                <div className="feed-body">
                  <div className="feed-title-row">
                    <div>
                      <div className="feed-title">{fmtDate(h.log_date)}</div>
                      <div className="feed-meta">
                        <span>Logged by <b>{h.logged_by || '—'}</b></span>
                        {h.notes && <span>{h.notes}</span>}
                      </div>
                    </div>
                    <span className="feed-cost">{h.hours_reading} hrs</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="card card-pad">
        <span className="section-title mb-16"><Wrench size={17} /> Repair History</span>
        {repairs.length === 0 ? <p className="text-muted text-sm">No repairs logged for this asset yet.</p> : (
          repairs.map(r => (
            <div className="feed-card" key={r.id} style={{ cursor: 'default' }}>
              <div className={`feed-icon ${r.diy_or_shop === 'Shop' ? 'shop' : 'diy'}`}><Wrench size={17} /></div>
              <div className="feed-body">
                <div className="feed-title-row">
                  <div>
                    <div className="feed-title">{r.repair_type}</div>
                    <div className="feed-meta">
                      <span>{fmtDate(r.date)}</span>
                      <span>By <b>{r.performed_by || '—'}</b></span>
                      <span>{r.diy_or_shop}</span>
                    </div>
                  </div>
                  <div className="feed-right">
                    <RepairStatusBadge status={r.status} />
                    <span className="feed-cost">{money(r.total_cost)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
