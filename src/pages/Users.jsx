import { useEffect, useState } from 'react'
import { Plus, KeyRound, Users as UsersIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fmtDate } from '../lib/helpers'
import { EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const BLANK = { name: '', email: '', role: 'crew', crew: '', password: '' }

export default function UsersPage() {
  const { isSuperadmin, user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [resetUser, setResetUser] = useState(null)
  const [resetVal, setResetVal] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.rpc('admin_list_users')
    setUsers(data || [])
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.rpc('admin_create_user', {
      p_name: form.name, p_email: form.email || null, p_role: form.role,
      p_crew: form.crew || null, p_password: form.password,
    })
    setSaving(false); setAddOpen(false); setForm(BLANK); load()
  }

  async function toggleActive(u) {
    await supabase.rpc('admin_update_user', {
      p_id: u.id, p_name: u.name, p_email: u.email, p_role: u.role, p_crew: u.crew, p_active: !u.active,
    })
    load()
  }

  async function handleReset(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.rpc('admin_reset_credential', { p_id: resetUser.id, p_role: resetUser.role, p_password: resetVal })
    setSaving(false); setResetUser(null); setResetVal('')
  }

  return (
    <div>
      <p className="text-sm text-muted mb-16">
        Office/admin accounts log in with email + password. Crew log in with their name + a 4-digit PIN.
      </p>

      <div className="filters-bar">
        <div className="spacer" />
        <button className="btn btn-gold" onClick={() => { setForm(BLANK); setAddOpen(true) }}><Plus size={15} /> Add User</button>
      </div>

      {loading ? <p className="text-muted">Loading…</p> : users.length === 0 ? (
        <EmptyState icon={<UsersIcon size={36} />} title="No users yet" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Crew</th><th>Status</th><th>Added</th><th></th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="cell-strong">{u.name}</td>
                  <td className="cell-muted">{u.email || '—'}</td>
                  <td><span className="badge badge-neutral">{u.role}</span></td>
                  <td>{u.crew || '—'}</td>
                  <td>{u.active ? <span className="badge badge-active">Active</span> : <span className="badge badge-retired">Disabled</span>}</td>
                  <td className="cell-muted">{fmtDate(u.created_at)}</td>
                  <td>
                    <div className="flex gap-6">
                      <button className="icon-btn" title="Reset PIN/password" onClick={() => { setResetUser(u); setResetVal('') }}><KeyRound size={14} /></button>
                      {!(u.role === 'superadmin' && u.id !== me.id) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(u)}>{u.active ? 'Disable' : 'Enable'}</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && (
        <Modal title="Add User" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleAdd}>
            <div className="field"><label>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field"><label>Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="crew">Crew (name + PIN)</option>
                <option value="admin">Admin (email + password)</option>
                {isSuperadmin && <option value="superadmin">Superadmin (email + password)</option>}
              </select>
            </div>
            {form.role !== 'crew' && (
              <div className="field"><label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
            )}
            <div className="field"><label>Crew (optional)</label>
              <input value={form.crew} onChange={e => setForm({ ...form, crew: e.target.value })} placeholder="MC1, MC2, Weed Control…" />
            </div>
            <div className="field">
              <label>{form.role === 'crew' ? '4-digit PIN' : 'Password'}</label>
              <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add User'}</button>
            </div>
          </form>
        </Modal>
      )}

      {resetUser && (
        <Modal title={`Reset Login — ${resetUser.name}`} onClose={() => setResetUser(null)}>
          <form onSubmit={handleReset}>
            <div className="field">
              <label>New {resetUser.role === 'crew' ? 'PIN' : 'Password'}</label>
              <input value={resetVal} onChange={e => setResetVal(e.target.value)} required autoFocus />
            </div>
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setResetUser(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
