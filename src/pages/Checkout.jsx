import { useEffect, useState } from 'react'
import { Plus, ArrowRightLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fmtDate, todayISO, EQUIPMENT_TYPES } from '../lib/helpers'
import { EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'

const BLANK = { date_out: todayISO(), borrower: '', crew: '', equipment_id: '', serial_last4: '', type: 'Mower', reason: '', okd_by: '', notes: '' }

export default function Checkout() {
  const [rows, setRows] = useState([])
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [showReturned, setShowReturned] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: r }, { data: e }] = await Promise.all([
      supabase.from('equipment_checkout').select('*').order('date_out', { ascending: false }),
      supabase.from('equipment').select('id,type,serial_last4,crew_assigned').order('type'),
    ])
    setRows(r || []); setEquipment(e || [])
    setLoading(false)
  }

  function onPickEquipment(id) {
    const eq = equipment.find(e => e.id === id)
    setForm(f => ({ ...f, equipment_id: id, type: eq?.type || f.type, serial_last4: eq?.serial_last4 || f.serial_last4 }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('equipment_checkout').insert([{ ...form, equipment_id: form.equipment_id || null }])
    setSaving(false); setModalOpen(false); setForm(BLANK); load()
  }

  async function markReturned(r) {
    await supabase.from('equipment_checkout').update({ date_returned: todayISO() }).eq('id', r.id)
    load()
  }

  const visible = rows.filter(r => showReturned || !r.date_returned)

  return (
    <div>
      <div className="filters-bar">
        <label className="flex items-center gap-6 text-sm" style={{ fontWeight: 600 }}>
          <input type="checkbox" style={{ width: 16 }} checked={showReturned} onChange={e => setShowReturned(e.target.checked)} /> Show returned items
        </label>
        <div className="spacer" />
        <button className="btn btn-gold" onClick={() => { setForm(BLANK); setModalOpen(true) }}><Plus size={15} /> Check Out Equipment</button>
      </div>

      {loading ? <p className="text-muted">Loading…</p> : visible.length === 0 ? (
        <EmptyState icon={<ArrowRightLeft size={36} />} title="Nothing checked out" sub="Backup gear handed out from the yard will show up here." />
      ) : (
        <>
          <div className="table-wrap hide-mobile">
            <table className="data-table">
              <thead><tr><th>Date Out</th><th>Borrower</th><th>Crew</th><th>Item</th><th>Reason</th><th>OK'd By</th><th>Returned</th><th></th></tr></thead>
              <tbody>
                {visible.map(r => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.date_out)}</td>
                    <td className="cell-strong">{r.borrower}</td>
                    <td>{r.crew || '—'}</td>
                    <td>{r.type} #{r.serial_last4 || '—'}</td>
                    <td>{r.reason || '—'}</td>
                    <td>{r.okd_by || '—'}</td>
                    <td>{r.date_returned ? fmtDate(r.date_returned) : <span className="badge badge-progress">Out</span>}</td>
                    <td>{!r.date_returned && <button className="btn btn-ghost btn-sm" onClick={() => markReturned(r)}><CheckCircle2 size={13} /> Returned</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-list show-mobile">
            {visible.map(r => (
              <div className="row-card" key={r.id}>
                <div className="row-card-top"><b>{r.borrower}</b>{r.date_returned ? <span className="badge badge-stocked">Returned</span> : <span className="badge badge-progress">Out</span>}</div>
                <div className="row-card-line"><span>Item</span><b>{r.type} #{r.serial_last4 || '—'}</b></div>
                <div className="row-card-line"><span>Date Out</span><b>{fmtDate(r.date_out)}</b></div>
                <div className="row-card-line"><span>Reason</span><b>{r.reason || '—'}</b></div>
                {!r.date_returned && <button className="btn btn-ghost btn-sm w-full mt-10" onClick={() => markReturned(r)}>Mark Returned</button>}
              </div>
            ))}
          </div>
        </>
      )}

      {modalOpen && (
        <Modal title="Check Out Equipment" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave}>
            <div className="field-row">
              <div className="field"><label>Date Out</label>
                <input type="date" value={form.date_out} onChange={e => setForm({ ...form, date_out: e.target.value })} required />
              </div>
              <div className="field"><label>Borrower</label>
                <input value={form.borrower} onChange={e => setForm({ ...form, borrower: e.target.value })} required />
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Crew</label>
                <input value={form.crew} onChange={e => setForm({ ...form, crew: e.target.value })} />
              </div>
              <div className="field"><label>Equipment</label>
                <select value={form.equipment_id} onChange={e => onPickEquipment(e.target.value)}>
                  <option value="">— Not in asset list —</option>
                  {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.type} #{eq.serial_last4 || '—'}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Type (if not listed)</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field"><label>Serial (last 4)</label>
                <input value={form.serial_last4} onChange={e => setForm({ ...form, serial_last4: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Reason</label>
                <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Backup during repair…" />
              </div>
              <div className="field"><label>OK'd By</label>
                <input value={form.okd_by} onChange={e => setForm({ ...form, okd_by: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Check Out'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
