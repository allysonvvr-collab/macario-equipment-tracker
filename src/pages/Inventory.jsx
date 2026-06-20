import { useEffect, useMemo, useState } from 'react'
import { Plus, Package, History, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fmtDate, money, partStatus } from '../lib/helpers'
import { PartStatusBadge, EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const BLANK = {
  part_name: '', part_number: '', division: 'Mowing', for_equipment_type: '', fits: '', unit: '',
  vendor: '', price: '', on_hand: '0', reorder_point: '0', reorder_qty: '', notes: '',
}

export default function Inventory() {
  const { user } = useAuth()
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [division, setDivision] = useState('All')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [countModal, setCountModal] = useState(null) // part being recounted
  const [countVal, setCountVal] = useState('')
  const [historyModal, setHistoryModal] = useState(null)
  const [historyRows, setHistoryRows] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('parts_catalog').select('*').eq('active', true).order('division').order('part_name')
    setParts(data || [])
    setLoading(false)
  }

  const divisions = useMemo(() => ['All', ...new Set(parts.map(p => p.division).filter(Boolean))], [parts])

  const statusRank = { out: 0, low: 1, stocked: 2 }

  const divisionParts = parts.filter(p => division === 'All' || p.division === division)
  const bannerStats = divisionParts.reduce((acc, p) => {
    const st = partStatus(p)
    acc[st] = (acc[st] || 0) + 1
    return acc
  }, {})

  const filtered = parts
    .filter(p => {
      if (division !== 'All' && p.division !== division) return false
      if (search) {
        const s = search.toLowerCase()
        if (!`${p.part_name} ${p.part_number} ${p.vendor} ${p.fits}`.toLowerCase().includes(s)) return false
      }
      return true
    })
    .sort((a, b) => {
      const r = statusRank[partStatus(a)] - statusRank[partStatus(b)]
      return r !== 0 ? r : a.part_name.localeCompare(b.part_name)
    })

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('parts_catalog').insert([{
      ...form, price: form.price === '' ? null : Number(form.price),
      on_hand: Number(form.on_hand || 0), reorder_point: Number(form.reorder_point || 0),
      reorder_qty: form.reorder_qty === '' ? null : Number(form.reorder_qty),
      last_counted_at: new Date().toISOString(), last_counted_by: user?.name || null,
    }])
    setSaving(false); setAddOpen(false); setForm(BLANK); load()
  }

  function openCount(p) { setCountModal(p); setCountVal(String(p.on_hand ?? 0)) }

  async function saveCount(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.rpc('update_part_count', { p_part_id: countModal.id, p_qty: Number(countVal), p_counted_by: user?.name || null })
    setSaving(false); setCountModal(null); load()
  }

  async function openHistory(p) {
    setHistoryModal(p)
    const { data } = await supabase.from('inventory_count_history').select('*').eq('part_id', p.id).order('count_date', { ascending: false }).limit(30)
    setHistoryRows(data || [])
  }

  return (
    <div>
      <div className="pill-tabs mb-16">
        {divisions.map(d => (
          <button key={d} className={`pill-tab ${division === d ? 'active' : ''}`} onClick={() => setDivision(d)}>{d}</button>
        ))}
      </div>

      <div className="summary-banner">
        <span className="sb-out">Out of stock: <b>{bannerStats.out || 0}</b></span>
        <span className="sb-low">Low / reorder: <b>{bannerStats.low || 0}</b></span>
        <span className="sb-ok">Stocked: <b>{bannerStats.stocked || 0}</b></span>
        <span className="text-muted">· {divisionParts.length} item{divisionParts.length === 1 ? '' : 's'} total{division !== 'All' ? ` in ${division}` : ''}</span>
      </div>

      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={15} />
          <input type="text" placeholder="Search parts…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="spacer" />
        <button className="btn btn-gold" onClick={() => { setForm({ ...BLANK, division: division === 'All' ? 'Mowing' : division }); setAddOpen(true) }}>
          <Plus size={15} /> Add Part
        </button>
      </div>

      {loading ? <p className="text-muted">Loading…</p> : filtered.length === 0 ? (
        <EmptyState icon={<Package size={36} />} title="No parts found" sub="Add parts to start tracking stock for this division." />
      ) : (
        <>
          <div className="table-wrap hide-mobile">
            <table className="data-table">
              <thead>
                <tr><th>Part</th><th>Division</th><th>Vendor</th><th>Price</th><th>On Hand</th><th>Reorder At</th><th>Status</th><th>Last Counted</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td className="cell-strong">{p.part_name}<div className="text-xs text-muted">{p.fits}</div></td>
                    <td>{p.division}</td>
                    <td>{p.vendor || '—'}</td>
                    <td>{money(p.price)}</td>
                    <td className="cell-strong">{p.on_hand}{p.unit ? ` ${p.unit}` : ''}</td>
                    <td>{p.reorder_point}{p.unit ? ` ${p.unit}` : ''}</td>
                    <td><PartStatusBadge statusKey={partStatus(p)} /></td>
                    <td className="cell-muted">{p.last_counted_at ? fmtDate(p.last_counted_at.slice(0, 10)) : '—'}</td>
                    <td>
                      <div className="flex gap-6">
                        <button className="btn btn-ghost btn-sm" onClick={() => openCount(p)}>Update Count</button>
                        <button className="icon-btn" onClick={() => openHistory(p)} title="History"><History size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card-list show-mobile">
            {filtered.map(p => (
              <div className="row-card" key={p.id}>
                <div className="row-card-top"><b>{p.part_name}</b><PartStatusBadge statusKey={partStatus(p)} /></div>
                <div className="row-card-line"><span>On hand</span><b>{p.on_hand}{p.unit ? ` ${p.unit}` : ''} (reorder at {p.reorder_point})</b></div>
                <div className="row-card-line"><span>Division</span><b>{p.division}</b></div>
                <div className="row-card-line"><span>Vendor</span><b>{p.vendor || '—'}</b></div>
                <div className="flex gap-6 mt-10">
                  <button className="btn btn-ghost btn-sm w-full" onClick={() => openCount(p)}>Update Count</button>
                  <button className="icon-btn" onClick={() => openHistory(p)}><History size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {addOpen && (
        <Modal title="Add Part" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleAdd}>
            <div className="field"><label>Part Name</label>
              <input value={form.part_name} onChange={e => setForm({ ...form, part_name: e.target.value })} required />
            </div>
            <div className="field-row">
              <div className="field"><label>Division</label>
                <input value={form.division} onChange={e => setForm({ ...form, division: e.target.value })} placeholder="Mowing, Weed Control, Christmas Lights…" />
              </div>
              <div className="field"><label>For Equipment Type</label>
                <input value={form.for_equipment_type} onChange={e => setForm({ ...form, for_equipment_type: e.target.value })} placeholder="Mower, Multiple…" />
              </div>
            </div>
            <div className="field"><label>Fits</label>
              <input value={form.fits} onChange={e => setForm({ ...form, fits: e.target.value })} placeholder="e.g. Exmark 30&quot; walk-behind" />
            </div>
            <div className="field-row">
              <div className="field"><label>Part #</label>
                <input value={form.part_number} onChange={e => setForm({ ...form, part_number: e.target.value })} />
              </div>
              <div className="field"><label>Unit</label>
                <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="Bag, Gallon, Bottle, Jug…" />
              </div>
            </div>
            <div className="field"><label>Vendor</label>
              <input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field"><label>Price ($)</label>
                <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="field"><label>On Hand Now</label>
                <input type="number" min="0" value={form.on_hand} onChange={e => setForm({ ...form, on_hand: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Reorder Point</label>
                <input type="number" min="0" value={form.reorder_point} onChange={e => setForm({ ...form, reorder_point: e.target.value })} />
              </div>
              <div className="field"><label>Reorder Qty</label>
                <input type="number" min="0" value={form.reorder_qty} onChange={e => setForm({ ...form, reorder_qty: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Part'}</button>
            </div>
          </form>
        </Modal>
      )}

      {countModal && (
        <Modal title={`Update Count — ${countModal.part_name}`} onClose={() => setCountModal(null)}>
          <form onSubmit={saveCount}>
            <div className="field"><label>Current Count On Hand</label>
              <input type="number" min="0" value={countVal} onChange={e => setCountVal(e.target.value)} required autoFocus />
            </div>
            <p className="hint">Reorder point is {countModal.reorder_point}. This updates instantly and logs to history — no need to duplicate any sheet.</p>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setCountModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Count'}</button>
            </div>
          </form>
        </Modal>
      )}

      {historyModal && (
        <Modal title={`Count History — ${historyModal.part_name}`} onClose={() => setHistoryModal(null)}>
          {historyRows.length === 0 ? <p className="text-muted text-sm">No counts logged yet.</p> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Date</th><th>On Hand</th><th>Counted By</th></tr></thead>
                <tbody>
                  {historyRows.map(h => <tr key={h.id}><td>{fmtDate(h.count_date)}</td><td className="cell-strong">{h.on_hand_qty}</td><td>{h.counted_by || '—'}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}