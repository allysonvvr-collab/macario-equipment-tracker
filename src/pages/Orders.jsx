import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Package2, CheckCircle2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fmtDate, money, todayISO, ORDER_CATEGORIES, ORDER_STATUSES } from '../lib/helpers'
import { EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const BLANK = {
  category: 'FWC Chemical', date_ordered: todayISO(), vendor: '', product: '', order_number: '',
  qty: '', unit_size: '', cost: '', who_ordered: '', expected_date: '', date_received: '',
  checked_in_by: '', status: 'Ordered', notes: '',
}

export default function Orders() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('FWC Chemical')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (searchParams.get('new')) {
      openAdd()
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('orders').select('*').order('date_ordered', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  const filtered = rows.filter(r => r.category === tab)

  function openAdd() { setForm({ ...BLANK, category: tab, who_ordered: user?.name || '' }); setEditId(null); setModalOpen(true) }
  function openEdit(r) {
    setForm({ ...BLANK, ...r, qty: r.qty ?? '', cost: r.cost ?? '', expected_date: r.expected_date || '', date_received: r.date_received || '' })
    setEditId(r.id); setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      category: form.category, date_ordered: form.date_ordered, vendor: form.vendor || null,
      product: form.product, order_number: form.order_number || null,
      qty: form.qty === '' ? null : Number(form.qty), unit_size: form.unit_size || null,
      cost: form.cost === '' ? null : Number(form.cost), who_ordered: form.who_ordered || null,
      expected_date: form.expected_date || null, date_received: form.date_received || null,
      checked_in_by: form.checked_in_by || null, status: form.status, notes: form.notes || null,
      created_by: user?.name || null, updated_at: new Date().toISOString(),
    }
    if (editId) await supabase.from('orders').update(payload).eq('id', editId)
    else await supabase.from('orders').insert([payload])
    setSaving(false); setModalOpen(false); load()
  }

  async function handleDelete() {
    if (!editId) return
    if (!window.confirm('Delete this order? This cannot be undone.')) return
    await supabase.from('orders').delete().eq('id', editId)
    setModalOpen(false); load()
  }

  async function markReceived(r) {
    await supabase.from('orders').update({
      status: 'Received', date_received: todayISO(), checked_in_by: user?.name || r.checked_in_by,
    }).eq('id', r.id)
    load()
  }

  return (
    <div>
      <div className="pill-tabs mb-16">
        {ORDER_CATEGORIES.map(c => (
          <button key={c} className={`pill-tab ${tab === c ? 'active' : ''}`} onClick={() => setTab(c)}>
            {c === 'FWC Chemical' ? 'FWC Orders' : 'Online Orders'}
          </button>
        ))}
      </div>

      <div className="filters-bar">
        <div className="spacer" />
        <button className="btn btn-gold" onClick={openAdd}><Plus size={15} /> Add Order</button>
      </div>

      {loading ? <p className="text-muted">Loading…</p> : filtered.length === 0 ? (
        <EmptyState icon={<Package2 size={36} />} title="No orders yet" sub="Log an order to start tracking it." />
      ) : (
        <div className="kanban-board">
          {ORDER_STATUSES.map(status => {
            const colRows = filtered.filter(r => r.status === status)
            return (
              <div className="kanban-column" key={status}>
                <div className="kanban-column-header">
                  <span>{status}</span>
                  <span className="group-count">{colRows.length}</span>
                </div>
                {colRows.length === 0 ? (
                  <div className="kanban-empty">Nothing here</div>
                ) : colRows.map(r => (
                  <div className="row-card" key={r.id} onClick={() => openEdit(r)} style={{ cursor: 'pointer' }}>
                    <div className="row-card-top"><b>{r.product}</b></div>
                    <div className="row-card-line"><span>Vendor</span><b>{r.vendor || '—'}</b></div>
                    <div className="row-card-line"><span>Ordered</span><b>{fmtDate(r.date_ordered)}</b></div>
                    {tab === 'FWC Chemical' ? (
                      <div className="row-card-line"><span>Qty</span><b>{r.qty ?? '—'} {r.unit_size || ''}</b></div>
                    ) : (
                      <div className="row-card-line"><span>Cost</span><b>{money(r.cost)}</b></div>
                    )}
                    {r.expected_date && <div className="row-card-line"><span>Expected</span><b>{fmtDate(r.expected_date)}</b></div>}
                    {status !== 'Received' && (
                      <button className="btn btn-ghost btn-sm w-full mt-10" onClick={(e) => { e.stopPropagation(); markReceived(r) }}>
                        <CheckCircle2 size={13} /> Mark Received
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <Modal title={editId ? 'Edit Order' : 'Add Order'} onClose={() => setModalOpen(false)} width="600px">
          <form onSubmit={handleSave}>
            <div className="modal-section-label">What &amp; Where</div>
            <div className="field-row">
              <div className="field"><label>Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {ORDER_CATEGORIES.map(c => <option key={c} value={c}>{c === 'FWC Chemical' ? 'FWC Orders' : 'Online Orders'}</option>)}
                </select>
              </div>
              <div className="field"><label>Date Ordered</label>
                <input type="date" value={form.date_ordered} onChange={e => setForm({ ...form, date_ordered: e.target.value })} required />
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Vendor</label>
                <input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="Harrels, Amazon, Home Depot…" />
              </div>
              <div className="field"><label>Product / Description</label>
                <input value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} required />
              </div>
            </div>

            <div className="modal-section-label">Quantity &amp; Cost</div>
            <div className="field-row">
              <div className="field"><label>Qty</label>
                <input type="number" min="0" step="0.01" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} />
              </div>
              <div className="field"><label>Unit Size</label>
                <input value={form.unit_size} onChange={e => setForm({ ...form, unit_size: e.target.value })} placeholder="2.5 gal, 30oz…" />
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Order # (if any)</label>
                <input value={form.order_number} onChange={e => setForm({ ...form, order_number: e.target.value })} />
              </div>
              <div className="field"><label>Cost ($)</label>
                <input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
              </div>
            </div>

            <div className="modal-section-label">Status &amp; Dates</div>
            <div className="field-row">
              <div className="field"><label>Who Ordered</label>
                <input value={form.who_ordered} onChange={e => setForm({ ...form, who_ordered: e.target.value })} />
              </div>
              <div className="field"><label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Expected Date</label>
                <input type="date" value={form.expected_date} onChange={e => setForm({ ...form, expected_date: e.target.value })} />
              </div>
              <div className="field"><label>Date Received</label>
                <input type="date" value={form.date_received} onChange={e => setForm({ ...form, date_received: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>Checked In By</label>
              <input value={form.checked_in_by} onChange={e => setForm({ ...form, checked_in_by: e.target.value })} />
            </div>
            <div className="field"><label>Notes / For</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. For MC1, replacement for MWR-02…" />
            </div>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <div className="flex gap-10">
                {editId && <button type="button" className="btn btn-danger" onClick={handleDelete}><Trash2 size={14} /> Delete</button>}
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : (editId ? 'Save Changes' : 'Add Order')}</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
