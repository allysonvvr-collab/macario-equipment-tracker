import { useEffect, useState } from 'react'
import { ClipboardCheck, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fmtDate, todayISO } from '../lib/helpers'
import { RepairStatusBadge, EmptyState } from '../components/Badges'
import { ShopTag } from '../components/Badges'

export default function ShopStatus() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('repair_log').select('*')
      .in('status', ['At Shop', 'Waiting on Parts'])
      .order('date_sent_to_shop', { ascending: true })
    setRows(data || [])
    setLoading(false)
  }

  async function markReturned(r) {
    await supabase.from('repair_log').update({
      status: 'Completed', date_returned: todayISO(), updated_at: new Date().toISOString(),
    }).eq('id', r.id)
    if (r.equipment_id) await supabase.from('equipment').update({ status: 'Active' }).eq('id', r.equipment_id)
    load()
  }

  function daysOut(r) {
    if (!r.date_sent_to_shop) return null
    const sent = new Date(r.date_sent_to_shop)
    const diff = Math.floor((Date.now() - sent.getTime()) / 86400000)
    return diff
  }

  if (loading) return <p className="text-muted">Loading…</p>

  return (
    <div>
      <p className="text-sm text-muted mb-16">Everything currently sitting at a shop or mechanic, oldest first.</p>

      {rows.length === 0 ? (
        <EmptyState icon={<ClipboardCheck size={36} />} title="Nothing out right now" sub="All equipment is in the yard or out on routes." />
      ) : (
        <div className="card-list">
          {rows.map(r => {
            const days = daysOut(r)
            return (
              <div className="card card-pad" key={r.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
                <div style={{ minWidth: 220 }}>
                  <div className="flex items-center gap-10 mb-6">
                    <ShopTag>{r.type} #{r.serial_last4 || '—'}</ShopTag>
                    <RepairStatusBadge status={r.status} />
                  </div>
                  <p className="text-sm" style={{ fontWeight: 700 }}>{r.repair_type} — {r.shop_name || 'Shop not specified'}</p>
                  <p className="text-xs text-muted mt-6">Crew {r.crew || '—'} · Sent {fmtDate(r.date_sent_to_shop)}{r.eta ? ` · ETA ${fmtDate(r.eta)}` : ''}</p>
                  {r.notes && <p className="text-xs text-muted mt-6">📝 {r.notes}</p>}
                </div>
                <div className="flex items-center gap-10">
                  {days !== null && (
                    <span className={`badge ${days > 5 ? 'badge-out' : days > 2 ? 'badge-low' : 'badge-neutral'}`}>{days} day{days === 1 ? '' : 's'} out</span>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={() => markReturned(r)}><CheckCircle2 size={14} /> Mark Returned</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
