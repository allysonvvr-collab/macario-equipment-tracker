import { useEffect, useState } from 'react'
import { Clock, Plus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fmtDate, todayISO } from '../lib/helpers'
import { EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'

export default function MowerHours() {
  const { user } = useAuth()
  const [mowers, setMowers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalEq, setModalEq] = useState(null)
  const [reading, setReading] = useState('')
  const [logDate, setLogDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState({}) // id -> last log row

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('equipment').select('*').eq('type', 'Mower').neq('status', 'Retired').order('crew_assigned')
    setMowers(data || [])
    const { data: logs } = await supabase.from('equipment_hours_log').select('*').order('log_date', { ascending: false })
    const last = {}
    for (const l of (logs || [])) { if (!last[l.equipment_id]) last[l.equipment_id] = l }
    setHistory(last)
    setLoading(false)
  }

  function openLog(eq) { setModalEq(eq); setReading(eq.current_hours ?? ''); setLogDate(todayISO()); setNotes('') }

  async function handleSave(e) {
    e.preventDefault()
    if (reading === '') return
    setSaving(true)
    await supabase.rpc('log_equipment_hours', {
      p_equipment_id: modalEq.id, p_hours: Number(reading), p_logged_by: user?.name || null,
      p_notes: notes || null, p_log_date: logDate,
    })
    setSaving(false); setModalEq(null); load()
  }

  if (loading) return <p className="text-muted">Loading…</p>

  return (
    <div>
      <p className="text-sm text-muted mb-16">Track hour-meter readings on every mower so you know when service is due.</p>

      {mowers.length === 0 ? (
        <EmptyState icon={<Clock size={36} />} title="No mowers on file" sub="Add mowers from the All Equipment page." />
      ) : (
        <div className="table-wrap hide-mobile">
          <table className="data-table">
            <thead><tr><th>Mower</th><th>Crew</th><th>Current Hours</th><th>Last Logged</th><th></th></tr></thead>
            <tbody>
              {mowers.map(m => {
                const last = history[m.id]
                return (
                  <tr key={m.id}>
                    <td className="cell-strong">#{m.serial_last4 || '—'} {m.make_model ? `(${m.make_model})` : ''}</td>
                    <td>{m.crew_assigned || '—'}</td>
                    <td>{m.current_hours ?? '—'}</td>
                    <td className="cell-muted">{last ? fmtDate(last.log_date) : 'Never'}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openLog(m)}><Plus size={13} /> Log Hours</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="card-list show-mobile">
        {mowers.map(m => {
          const last = history[m.id]
          return (
            <div className="row-card" key={m.id}>
              <div className="row-card-top"><b>#{m.serial_last4 || '—'}</b><span className="text-sm">{m.current_hours ?? '—'} hrs</span></div>
              <div className="row-card-line"><span>Crew</span><b>{m.crew_assigned || '—'}</b></div>
              <div className="row-card-line"><span>Last logged</span><b>{last ? fmtDate(last.log_date) : 'Never'}</b></div>
              <button className="btn btn-ghost btn-sm w-full mt-10" onClick={() => openLog(m)}><Plus size={13} /> Log Hours</button>
            </div>
          )
        })}
      </div>

      {modalEq && (
        <Modal title={`Log Hours — #${modalEq.serial_last4 || ''}`} onClose={() => setModalEq(null)}>
          <form onSubmit={handleSave}>
            <div className="field-row">
              <div className="field"><label>Date</label>
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} required />
              </div>
              <div className="field"><label>Hours Reading</label>
                <input type="number" min="0" step="0.1" value={reading} onChange={e => setReading(e.target.value)} required autoFocus />
              </div>
            </div>
            <div className="field"><label>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
            </div>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setModalEq(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Reading'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
