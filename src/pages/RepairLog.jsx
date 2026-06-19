import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { money, fmtDate, todayISO, calcRepairTotal, calcLaborCost, REPAIR_TYPES } from '../lib/helpers'
import { RepairStatusBadge, EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const BLANK = {
  date: todayISO(), equipment_id: '', type: '', crew: '', serial_last4: '',
  repair_type: 'Other', performed_by: '', diy_or_shop: 'DIY', status: 'Completed',
  shop_id: '', shop_name: '', date_sent_to_shop: '', date_returned: '', eta: '',
  time_minutes: '', rate_per_hour: '20', our_labor_cost: '', parts_cost: '', shop_labor_cost: '',
  total_cost: '', notes: '',
}

export default function RepairLog() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [equipment, setEquipment] = useState([])
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [diyFilter, setDiyFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: r }, { data: e }, { data: s }] = await Promise.all([
      supabase.from('repair_log').select('*').order('date', { ascending: false }),
      supabase.from('equipment').select('id,type,serial_last4,crew_assigned').order('type'),
      supabase.from('shops').select('*').eq('active', true).order('name'),
    ])
    setRows(r || []); setEquipment(e || []); setShops(s || [])
    setLoading(false)
  }

  const filtered = rows.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false
    if (diyFilter !== 'All' && r.diy_or_shop !== diyFilter) return false
    if (search) {
      const s = search.toLowerCase()
      const hay = `${r.type} ${r.serial_last4} ${r.crew} ${r.repair_type} ${r.performed_by} ${r.notes}`.toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })

  function openAdd() { setForm({ ...BLANK, performed_by: user?.name || '' }); setEditId(null); setModalOpen(true) }
  function openEdit(r) {
    setForm({ ...BLANK, ...r, time_minutes: r.time_minutes ?? '', rate_per_hour: r.rate_per_hour ?? '20', equipment_id: r.equipment_id || '', shop_id: r.shop_id || '' })
    setEditId(r.id); setModalOpen(true)
  }

  function onPickEquipment(eqId) {
    const eq = equipment.find(e => e.id === eqId)
    setForm(f => ({ ...f, equipment_id: eqId, type: eq?.type || f.type, serial_last4: eq?.serial_last4 || f.serial_last4, crew: eq?.crew_assigned || f.crew }))
  }

  function onPickShop(shopId) {
    const shop = shops.find(s => s.id === shopId)
    setForm(f => ({ ...f, shop_id: shopId, shop_name: shop?.name || f.shop_name }))
  }

  // live cost calc
  const liveLabor = useMemo(() => calcLaborCost(form.time_minutes, form.rate_per_hour), [form.time_minutes, form.rate_per_hour])
  const liveTotal = useMemo(() => calcRepairTotal({
    our_labor_cost: form.diy_or_shop === 'DIY' ? (form.our_labor_cost !== '' ? form.our_labor_cost : liveLabor) : form.our_labor_cost,
    parts_cost: form.parts_cost, shop_labor_cost: form.shop_labor_cost,
  }), [form, liveLabor])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      date: form.date, equipment_id: form.equipment_id || null, type: form.type || null,
      crew: form.crew || null, serial_last4: form.serial_last4 || null, repair_type: form.repair_type,
      performed_by: form.performed_by || null, diy_or_shop: form.diy_or_shop, status: form.status,
      shop_id: form.shop_id || null, shop_name: form.shop_name || null,
      date_sent_to_shop: form.date_sent_to_shop || null, date_returned: form.date_returned || null,
      eta: form.eta || null, time_minutes: form.time_minutes === '' ? null : Number(form.time_minutes),
      rate_per_hour: form.rate_per_hour === '' ? null : Number(form.rate_per_hour),
      our_labor_cost: form.our_labor_cost !== '' ? Number(form.our_labor_cost) : (form.diy_or_shop === 'DIY' ? liveLabor : 0),
      parts_cost: form.parts_cost === '' ? null : Number(form.parts_cost),
      shop_labor_cost: form.shop_labor_cost === '' ? null : Number(form.shop_labor_cost),
      total_cost: liveTotal, notes: form.notes || null, created_by: user?.name || null,
      updated_at: new Date().toISOString(),
    }
    if (editId) {
      await supabase.from('repair_log').update(payload).eq('id', editId)
    } else {
      await supabase.from('repair_log').insert([payload])
      if (form.equipment_id && form.status === 'In Progress') {
        await supabase.from('equipment').update({ status: 'In Repair' }).eq('id', form.equipment_id)
      }
    }
    setSaving(false); setModalOpen(false); load()
  }

  return (
    <div>
      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={15} />
          <input type="text" placeholder="Search repairs…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {['All', 'Completed', 'At Shop', 'Waiting on Parts', 'In Progress'].map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
        </select>
        <select value={diyFilter} onChange={e => setDiyFilter(e.target.value)}>
          {['All', 'DIY', 'Shop'].map(s => <option key={s} value={s}>{s === 'All' ? 'DIY or Shop' : s}</option>)}
        </select>
        <div className="spacer" />
        <button className="btn btn-gold" onClick={openAdd}><Plus size={15} /> Log Repair</button>
      </div>

      {loading ? <p className="text-muted">Loading…</p> : filtered.length === 0 ? (
        <EmptyState icon={<Wrench size={36} />} title="No repairs found" sub="Log your first repair to get started." />
      ) : (
        <>
          <div className="table-wrap hide-mobile">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Type / Serial</th><th>Crew</th><th>Repair</th><th>By</th><th>DIY/Shop</th><th>Status</th><th>Total</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="clickable" onClick={() => openEdit(r)}>
                    <td>{fmtDate(r.date)}</td>
                    <td className="cell-strong">{r.type}{r.serial_last4 ? ` #${r.serial_last4}` : ''}</td>
                    <td>{r.crew || '—'}</td>
                    <td>{r.repair_type}</td>
                    <td>{r.performed_by || '—'}</td>
                    <td>{r.diy_or_shop}</td>
                    <td><RepairStatusBadge status={r.status} /></td>
                    <td>{money(r.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-list show-mobile">
            {filtered.map(r => (
              <div className="row-card" key={r.id} onClick={() => openEdit(r)}>
                <div className="row-card-top"><b>{r.type}{r.serial_last4 ? ` #${r.serial_last4}` : ''} — {r.repair_type}</b><RepairStatusBadge status={r.status} /></div>
                <div className="row-card-line"><span>Date</span><b>{fmtDate(r.date)}</b></div>
                <div className="row-card-line"><span>By</span><b>{r.performed_by || '—'} ({r.diy_or_shop})</b></div>
                <div className="row-card-line"><span>Total</span><b>{money(r.total_cost)}</b></div>
              </div>
            ))}
          </div>
        </>
      )}

      {modalOpen && (
        <Modal title={editId ? 'Edit Repair' : 'Log a Repair'} onClose={() => setModalOpen(false)} width="640px">
          <form onSubmit={handleSave}>
            <div className="field-row">
              <div className="field"><label>Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="field"><label>Equipment</label>
                <select value={form.equipment_id} onChange={e => onPickEquipment(e.target.value)}>
                  <option value="">— Not in asset list —</option>
                  {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.type} #{eq.serial_last4 || '—'} ({eq.crew_assigned || 'unassigned'})</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Type (if not in list)</label>
                <input value={form.type || ''} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="Mower, Spreader…" />
              </div>
              <div className="field"><label>Crew</label>
                <input value={form.crew || ''} onChange={e => setForm({ ...form, crew: e.target.value })} placeholder="MC1, MC2…" />
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Repair Type</label>
                <select value={form.repair_type} onChange={e => setForm({ ...form, repair_type: e.target.value })}>
                  {REPAIR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field"><label>Performed By</label>
                <input value={form.performed_by || ''} onChange={e => setForm({ ...form, performed_by: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>DIY or Shop</label>
                <select value={form.diy_or_shop} onChange={e => setForm({ ...form, diy_or_shop: e.target.value })}>
                  <option value="DIY">DIY</option><option value="Shop">Shop</option>
                </select>
              </div>
              <div className="field"><label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {['Completed', 'At Shop', 'Waiting on Parts', 'In Progress'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {form.diy_or_shop === 'Shop' && (
              <div className="card-pad" style={{ background: 'var(--gray-50)', borderRadius: 10, marginBottom: 14 }}>
                <div className="field-row">
                  <div className="field"><label>Shop / Mechanic</label>
                    <select value={form.shop_id} onChange={e => onPickShop(e.target.value)}>
                      <option value="">— Choose or type below —</option>
                      {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Shop name (if not listed)</label>
                    <input value={form.shop_name || ''} onChange={e => setForm({ ...form, shop_name: e.target.value })} />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field"><label>Date Sent</label>
                    <input type="date" value={form.date_sent_to_shop || ''} onChange={e => setForm({ ...form, date_sent_to_shop: e.target.value })} />
                  </div>
                  <div className="field"><label>ETA</label>
                    <input type="date" value={form.eta || ''} onChange={e => setForm({ ...form, eta: e.target.value })} />
                  </div>
                </div>
                <div className="field"><label>Date Returned</label>
                  <input type="date" value={form.date_returned || ''} onChange={e => setForm({ ...form, date_returned: e.target.value })} />
                </div>
              </div>
            )}

            {form.diy_or_shop === 'DIY' && (
              <div className="field-row">
                <div className="field"><label>Time (minutes)</label>
                  <input type="number" min="0" value={form.time_minutes} onChange={e => setForm({ ...form, time_minutes: e.target.value })} />
                </div>
                <div className="field"><label>Rate ($/hr)</label>
                  <input type="number" min="0" step="0.01" value={form.rate_per_hour} onChange={e => setForm({ ...form, rate_per_hour: e.target.value })} />
                </div>
              </div>
            )}

            <div className="field-row">
              <div className="field"><label>Parts Cost ($)</label>
                <input type="number" min="0" step="0.01" value={form.parts_cost} onChange={e => setForm({ ...form, parts_cost: e.target.value })} />
              </div>
              <div className="field"><label>Shop Labor ($)</label>
                <input type="number" min="0" step="0.01" value={form.shop_labor_cost} onChange={e => setForm({ ...form, shop_labor_cost: e.target.value })} />
              </div>
            </div>

            <div className="field">
              <label>Notes</label>
              <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="card-pad flex justify-between items-center" style={{ background: 'var(--green-100)', borderRadius: 10 }}>
              <span className="text-sm" style={{ fontWeight: 700, color: 'var(--green-800)' }}>Total Cost</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--green-900)' }}>{money(liveTotal)}</span>
            </div>

            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : (editId ? 'Save Changes' : 'Log Repair')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
