import { useEffect, useMemo, useState } from 'react'
import { Plus, Droplets } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fmtDate, todayISO, ceilingTo1000, suggestedGallons, fwcVariance } from '../lib/helpers'
import { FwcVarianceBadge, EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const BLANK = { app_date: todayISO(), technician: '', turf_sqft_scheduled: '', rate_per_1000: '2', actual_gallons_used: '', notes: '' }

export default function FwcTracker() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [techFilter, setTechFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('fwc_applications').select('*').order('app_date', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  const technicians = useMemo(() => ['All', ...new Set(rows.map(r => r.technician).filter(Boolean))], [rows])
  const filtered = rows.filter(r => techFilter === 'All' || r.technician === techFilter)

  const rounded = useMemo(() => ceilingTo1000(form.turf_sqft_scheduled), [form.turf_sqft_scheduled])
  const suggested = useMemo(() => suggestedGallons(rounded, form.rate_per_1000), [rounded, form.rate_per_1000])

  function openAdd() { setForm({ ...BLANK, technician: user?.name || '' }); setEditId(null); setModalOpen(true) }
  function openEdit(r) {
    setForm({
      app_date: r.app_date, technician: r.technician, turf_sqft_scheduled: r.turf_sqft_scheduled,
      rate_per_1000: r.rate_per_1000, actual_gallons_used: r.actual_gallons_used ?? '', notes: r.notes || '',
    })
    setEditId(r.id); setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      app_date: form.app_date, technician: form.technician,
      turf_sqft_scheduled: Number(form.turf_sqft_scheduled || 0),
      turf_sqft_rounded: rounded, rate_per_1000: Number(form.rate_per_1000 || 2),
      suggested_gallons: suggested,
      actual_gallons_used: form.actual_gallons_used === '' ? null : Number(form.actual_gallons_used),
      notes: form.notes || null, created_by: user?.name || null, updated_at: new Date().toISOString(),
    }
    if (editId) await supabase.from('fwc_applications').update(payload).eq('id', editId)
    else await supabase.from('fwc_applications').insert([payload])
    setSaving(false); setModalOpen(false); load()
  }

  // Month-to-date summary
  const totals = filtered.reduce((acc, r) => {
    acc.suggested += Number(r.suggested_gallons || 0)
    acc.actual += Number(r.actual_gallons_used || 0)
    return acc
  }, { suggested: 0, actual: 0 })

  return (
    <div>
      <p className="text-sm text-muted mb-16">
        Scheduled turf area → suggested gallons (2 gal per 1,000 sq ft, rounded up) → what was actually used. Flags anything more than 10% off target.
      </p>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Entries</div>
          <div className="kpi-value">{filtered.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Suggested Total</div>
          <div className="kpi-value">{totals.suggested.toFixed(0)} gal</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Actual Total</div>
          <div className="kpi-value">{totals.actual.toFixed(0)} gal</div>
        </div>
        <div className={`kpi-card ${Math.abs(totals.actual - totals.suggested) > totals.suggested * 0.1 ? 'warn' : ''}`}>
          <div className="kpi-label">Difference</div>
          <div className="kpi-value">{(totals.actual - totals.suggested).toFixed(0)} gal</div>
        </div>
      </div>

      <div className="filters-bar">
        <select value={techFilter} onChange={e => setTechFilter(e.target.value)}>
          {technicians.map(t => <option key={t} value={t}>{t === 'All' ? 'All Technicians' : t}</option>)}
        </select>
        <div className="spacer" />
        <button className="btn btn-gold" onClick={openAdd}><Plus size={15} /> Log Application</button>
      </div>

      {loading ? <p className="text-muted">Loading…</p> : filtered.length === 0 ? (
        <EmptyState icon={<Droplets size={36} />} title="No applications logged" sub="Log the first one to start tracking." />
      ) : (
        <>
          <div className="table-wrap hide-mobile">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Technician</th><th>Sq Ft Scheduled</th><th>Rounded</th><th>Suggested Gal</th><th>Actual Gal</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="clickable" onClick={() => openEdit(r)}>
                    <td>{fmtDate(r.app_date)}</td>
                    <td className="cell-strong">{r.technician}</td>
                    <td>{Number(r.turf_sqft_scheduled).toLocaleString()}</td>
                    <td className="cell-muted">{Number(r.turf_sqft_rounded).toLocaleString()}</td>
                    <td>{r.suggested_gallons}</td>
                    <td>{r.actual_gallons_used ?? '—'}</td>
                    <td><FwcVarianceBadge variance={fwcVariance(r.actual_gallons_used, r.suggested_gallons)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-list show-mobile">
            {filtered.map(r => (
              <div className="row-card" key={r.id} onClick={() => openEdit(r)}>
                <div className="row-card-top"><b>{r.technician} — {fmtDate(r.app_date)}</b><FwcVarianceBadge variance={fwcVariance(r.actual_gallons_used, r.suggested_gallons)} /></div>
                <div className="row-card-line"><span>Scheduled</span><b>{Number(r.turf_sqft_scheduled).toLocaleString()} sq ft</b></div>
                <div className="row-card-line"><span>Suggested / Actual</span><b>{r.suggested_gallons} / {r.actual_gallons_used ?? '—'} gal</b></div>
              </div>
            ))}
          </div>
        </>
      )}

      {modalOpen && (
        <Modal title={editId ? 'Edit Application' : 'Log Application'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave}>
            <div className="field-row">
              <div className="field"><label>Date</label>
                <input type="date" value={form.app_date} onChange={e => setForm({ ...form, app_date: e.target.value })} required />
              </div>
              <div className="field"><label>Technician</label>
                <input value={form.technician} onChange={e => setForm({ ...form, technician: e.target.value })} required />
              </div>
            </div>
            <div className="field"><label>Turf Sq Ft Scheduled</label>
              <input type="number" min="0" value={form.turf_sqft_scheduled} onChange={e => setForm({ ...form, turf_sqft_scheduled: e.target.value })} required autoFocus />
            </div>
            <div className="field-row">
              <div className="field"><label>Rate (gal per 1,000 sq ft)</label>
                <input type="number" min="0" step="0.1" value={form.rate_per_1000} onChange={e => setForm({ ...form, rate_per_1000: e.target.value })} />
              </div>
              <div className="field"><label>Actual Gallons Used</label>
                <input type="number" min="0" step="0.1" value={form.actual_gallons_used} onChange={e => setForm({ ...form, actual_gallons_used: e.target.value })} placeholder="Fill in when done" />
              </div>
            </div>

            <div className="card-pad flex justify-between items-center" style={{ background: 'var(--green-100)', borderRadius: 10, marginBottom: 14 }}>
              <div>
                <div className="text-xs text-muted">Rounded to {rounded.toLocaleString()} sq ft</div>
                <span style={{ fontWeight: 700, color: 'var(--green-800)' }}>Suggested Gallons</span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--green-900)' }}>{suggested} gal</span>
            </div>

            <div className="field"><label>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
            </div>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : (editId ? 'Save Changes' : 'Log Application')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
