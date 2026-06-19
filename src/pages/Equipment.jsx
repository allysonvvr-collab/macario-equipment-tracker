import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Tractor } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { EQUIPMENT_TYPES } from '../lib/helpers'
import { EquipmentStatusBadge, EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'

const BLANK = {
  type: 'Mower', serial_last4: '', serial_full: '', make_model: '',
  division: 'Mowing', crew_assigned: '', status: 'Active', notes: '',
}

export default function Equipment() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('All')
  const [crewFilter, setCrewFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('equipment').select('*').order('crew_assigned').order('type')
    setRows(data || [])
    setLoading(false)
  }

  const divisions = useMemo(() => ['All', ...new Set(rows.map(r => r.division).filter(Boolean))], [rows])
  const crews = useMemo(() => ['All', ...new Set(rows.map(r => r.crew_assigned).filter(Boolean))], [rows])

  const filtered = rows.filter(r => {
    if (divisionFilter !== 'All' && r.division !== divisionFilter) return false
    if (crewFilter !== 'All' && r.crew_assigned !== crewFilter) return false
    if (statusFilter !== 'All' && r.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      const hay = `${r.type} ${r.serial_last4} ${r.make_model} ${r.crew_assigned}`.toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })

  function openAdd() { setForm(BLANK); setModalOpen(true) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('equipment').insert([form])
    setSaving(false)
    setModalOpen(false)
    load()
  }

  return (
    <div>
      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={15} />
          <input type="text" placeholder="Search serial, type, crew…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)}>
          {divisions.map(d => <option key={d} value={d}>{d === 'All' ? 'All Divisions' : d}</option>)}
        </select>
        <select value={crewFilter} onChange={e => setCrewFilter(e.target.value)}>
          {crews.map(c => <option key={c} value={c}>{c === 'All' ? 'All Crews' : c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {['All', 'Active', 'In Repair', 'Retired'].map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
        </select>
        <div className="spacer" />
        <button className="btn btn-gold" onClick={openAdd}><Plus size={15} /> Add Equipment</button>
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Tractor size={36} />} title="No equipment found" sub="Try adjusting filters, or add a new asset." />
      ) : (
        <>
          <div className="table-wrap hide-mobile">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th><th>Serial</th><th>Make / Model</th><th>Division</th><th>Crew</th><th>Status</th><th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="clickable" onClick={() => navigate(`/equipment/${r.id}`)}>
                    <td className="cell-strong">{r.type}</td>
                    <td>#{r.serial_last4 || '—'}</td>
                    <td>{r.make_model || '—'}</td>
                    <td>{r.division}</td>
                    <td>{r.crew_assigned || '—'}</td>
                    <td><EquipmentStatusBadge status={r.status} /></td>
                    <td className="cell-muted">{r.current_hours ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card-list show-mobile">
            {filtered.map(r => (
              <div className="row-card" key={r.id} onClick={() => navigate(`/equipment/${r.id}`)}>
                <div className="row-card-top">
                  <b>{r.type} #{r.serial_last4 || '—'}</b>
                  <EquipmentStatusBadge status={r.status} />
                </div>
                <div className="row-card-line"><span>Make/Model</span><b>{r.make_model || '—'}</b></div>
                <div className="row-card-line"><span>Crew</span><b>{r.crew_assigned || '—'}</b></div>
                <div className="row-card-line"><span>Division</span><b>{r.division}</b></div>
              </div>
            ))}
          </div>
        </>
      )}

      {modalOpen && (
        <Modal title="Add Equipment" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave}>
            <div className="field-row">
              <div className="field">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Serial (last 4)</label>
                <input value={form.serial_last4} onChange={e => setForm({ ...form, serial_last4: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Make / Model</label>
              <input value={form.make_model} onChange={e => setForm({ ...form, make_model: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Division</label>
                <input value={form.division} onChange={e => setForm({ ...form, division: e.target.value })} placeholder="Mowing, Weed Control, Christmas Lights…" />
              </div>
              <div className="field">
                <label>Crew Assigned</label>
                <input value={form.crew_assigned} onChange={e => setForm({ ...form, crew_assigned: e.target.value })} placeholder="MC1, MC2, Backup Pool…" />
              </div>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {['Active', 'In Repair', 'Retired'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Equipment'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
