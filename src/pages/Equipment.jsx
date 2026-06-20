import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Tractor, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { EQUIPMENT_TYPES } from '../lib/helpers'
import { EquipmentStatusBadge, EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'

const BLANK = {
  type: 'Mower', serial_last4: '', serial_full: '', make_model: '',
  division: 'Mowing', crew_assigned: '', status: 'Active', notes: '',
}

// Keep named crews first, alphabetically; push the catch-all buckets to the end.
const CREW_ORDER_TAIL = ['Backup Pool', 'Parts Only']
function compareCrew(a, b) {
  const aTail = CREW_ORDER_TAIL.indexOf(a)
  const bTail = CREW_ORDER_TAIL.indexOf(b)
  if (aTail !== -1 || bTail !== -1) {
    if (aTail === -1) return -1
    if (bTail === -1) return 1
    return aTail - bTail
  }
  return a.localeCompare(b)
}

const COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'serial_last4', label: 'Serial' },
  { key: 'make_model', label: 'Make / Model' },
  { key: 'division', label: 'Division' },
  { key: 'status', label: 'Status' },
  { key: 'current_hours', label: 'Hours' },
]

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
  const [sortKey, setSortKey] = useState('type')
  const [sortDir, setSortDir] = useState('asc')
  const [collapsed, setCollapsed] = useState(new Set())

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('equipment').select('*').order('crew_assigned').order('type')
    setRows(data || [])
    setLoading(false)
  }

  const divisions = useMemo(() => ['All', ...new Set(rows.map(r => r.division).filter(Boolean))], [rows])
  const crews = useMemo(() => ['All', ...new Set(rows.map(r => r.crew_assigned).filter(Boolean))], [rows])

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function toggleGroup(crew) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(crew) ? next.delete(crew) : next.add(crew)
      return next
    })
  }

  const filteredSorted = rows
    .filter(r => {
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
    .sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })

  // Group by crew (after sorting, so order within each group follows the sort).
  const groups = useMemo(() => {
    const map = new Map()
    for (const r of filteredSorted) {
      const key = r.crew_assigned || 'Unassigned'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    return [...map.entries()].sort(([a], [b]) => compareCrew(a, b))
  }, [filteredSorted])

  function openAdd() { setForm(BLANK); setModalOpen(true) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('equipment').insert([form])
    setSaving(false)
    setModalOpen(false)
    load()
  }

  function SortHeader({ col }) {
    const active = sortKey === col.key
    return (
      <th className={`sortable ${active ? 'active' : ''}`} onClick={() => handleSort(col.key)}>
        {col.label}
        <span className="sort-arrow">
          {active ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} />}
        </span>
      </th>
    )
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
      ) : filteredSorted.length === 0 ? (
        <EmptyState icon={<Tractor size={36} />} title="No equipment found" sub="Try adjusting filters, or add a new asset." />
      ) : (
        groups.map(([crew, items]) => {
          const isCollapsed = collapsed.has(crew)
          return (
            <div key={crew}>
              <div className={`group-header ${isCollapsed ? 'collapsed' : ''}`} onClick={() => toggleGroup(crew)}>
                <ChevronDown size={15} className="chev" />
                {crew}
                <span className="group-count">{items.length} item{items.length === 1 ? '' : 's'}</span>
              </div>

              {!isCollapsed && (
                <div className="group-body">
                  <div className="table-wrap hide-mobile">
                    <table className="data-table">
                      <thead>
                        <tr>{COLUMNS.map(col => <SortHeader key={col.key} col={col} />)}</tr>
                      </thead>
                      <tbody>
                        {items.map(r => (
                          <tr key={r.id} className="clickable" onClick={() => navigate(`/equipment/${r.id}`)}>
                            <td className="cell-strong">{r.type}</td>
                            <td>#{r.serial_last4 || '—'}</td>
                            <td>{r.make_model || '—'}</td>
                            <td>{r.division}</td>
                            <td><EquipmentStatusBadge status={r.status} /></td>
                            <td className="cell-muted">{r.current_hours ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="card-list show-mobile">
                    {items.map(r => (
                      <div className="row-card" key={r.id} onClick={() => navigate(`/equipment/${r.id}`)}>
                        <div className="row-card-top">
                          <b>{r.type} #{r.serial_last4 || '—'}</b>
                          <EquipmentStatusBadge status={r.status} />
                        </div>
                        <div className="row-card-line"><span>Make/Model</span><b>{r.make_model || '—'}</b></div>
                        <div className="row-card-line"><span>Division</span><b>{r.division}</b></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })
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