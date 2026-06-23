import { useEffect, useState } from 'react'
import { Plus, ArrowRightLeft, CheckCircle2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fmtDate, todayISO, EQUIPMENT_TYPES } from '../lib/helpers'
import { EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'

const BLANK = { date_out: todayISO(), borrower: '', crew: '', equipment_id: '', serial_last4: '', type: 'Mower', reason: '', okd_by: '', date_returned: '', notes: '' }

export default function Checkout() {
  const [rows, setRows] = useState([])
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
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

  function openAdd() { setForm(BLANK); setEditId(null); setModalOpen(true) }
  function openEdit(r) {
    setForm({ ...BLANK, ...r, equipment_id: r.equipment_id || '', date_returned: r.date_returned || '' })
    setEditId(r.id); setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, equipment_id: form.equipment_id || null, date_returned: form.date_returned || null }
    if (editId) await supabase.from('equipment_checkout').update(payload).eq('id', editId)
    else await supabase.from('equipment_checkout').insert([payload])
    setSaving(false); setModalOpen(false); setForm(BLANK); load()
  }

  async function handleDelete() {
    if (!editId) return
    if (!window.confirm('Delete this checkout entry? This cannot be undone.')) return
    await supabase.from('equipment_checkout').delete().eq('id', editId)
    setModalOpen(false); load()
  }

  async function markReturned(r) {
    await supabase.from('equipment_checkout').update({ date_returned: todayISO() }).eq('id', r.id)
    load()
  }

  const visible = rows.filter(r => showReturned || !r.date_returned)

  function daysOut(r) {
    if (r.date_returned) return null
    return Math.floor((Date.now() - new Date(r.date_out).getTime()) / 86400000)
  }

  return (
    <div>
      <div className="filters-bar">
        <label className="flex items-center gap-6 text-sm" style={{ fontWeight: 600 }}>
          <input type="checkbox" style={{ width: 16 }} checked={showReturned} onChange={e => setShowReturned(e.target.checked)} /> Show returned items
        </label>
        <div className="spacer" />
        <button className="btn btn-gold" onClick={openAdd}><Plus size={15} /> Check Out Equipment</button>
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
                  <tr key={r.id} className="clickable" onClick={() => openEdit(r)}>
                    <td>{fmtDate(r.date_out)}</td>
                    <td className="cell-strong">{r.borrower}</td>
                    <td>{r.crew || '—'}</td>
                    <td>{r.type} #{r.serial_last4 || '—'}</td>
                    <td>{r.reason || '—'}</td>
                    <td>{r.okd_by || '—'}</td>
                    <td>
                      {r.date_returned ? fmtDate(r.date_returned) : (
                        daysOut(r) > 14
                          ? <span className="badge badge-overdue">Overdue · {daysOut(r)}d</span>
                          : <span className="badge badge-progress">Out · {daysOut(r)}d</span>
                      )}
                    </td>
                    <td>{!r.date_returned && (
                      <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); markReturned(r) }}><CheckCircle2 size={13} /> Returned</button>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-list show-mobile">
            {visible.map(r => (
              <div className="row-card" key={r.id} onClick={() => openEdit(r)}>
                <div className="row-card-top">
                  <b>{r.borrower}</b>
                  {r.date_returned ? <span className="badge badge-stocked">Returned</span> : (
                    daysOut(r) > 14
                      ? <span className="badge badge-overdue">Overdue · {daysOut(r)}d</span>
                      : <span className="badge badge-progress">Out · {daysOut(r)}d</span>
                  )}
                </div>
                <div className="row-card-line"><span>Item</span><b>{r.type} #{r.serial_last4 || '—'}</b></div>
                <div className="row-card-line"><span>Date Out</span><b>{fmtDate(r.date_out)}</b></div>
                <div className="row-card-line"><span>Reason</span><b>{r.reason || '—'}</b></div>
                {!r.date_returned && (
                  <button className="btn btn-ghost btn-sm w-full mt-10" onClick={(e) => { e.stopPropagation(); markReturned(r) }}>Mark Returned</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {modalOpen && (
        <Modal title={editId ? 'Edit Checkout' : 'Check Out Equipment'} onClose={() => setModalOpen(false)}>
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
            {editId && (
              <div className="field"><label>Date Returned</label>
                <input type="date" value={form.date_returned} onChange={e => setForm({ ...form, date_returned: e.target.value })} />
                <p className="hint">Clear this to mark it as still checked out.</p>
              </div>
            )}
            <div className="field"><label>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <div className="flex gap-10">
                {editId && <button type="button" className="btn btn-danger" onClick={handleDelete}><Trash2 size={14} /> Delete</button>}
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : (editId ? 'Save Changes' : 'Check Out')}</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
