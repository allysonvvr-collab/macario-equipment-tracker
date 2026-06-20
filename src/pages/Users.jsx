import { useEffect, useState } from 'react'
import { Plus, KeyRound, Users as UsersIcon, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { MODULES } from '../lib/helpers'
import { EmptyState } from '../components/Badges'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const BLANK = { name: '', username: '', email: '', role: 'crew', crew: '', password: '', modules: [] }

function ModuleCheckboxes({ selected, onChange }) {
  function toggle(key) {
    onChange(selected.includes(key) ? selected.filter(m => m !== key) : [...selected, key])
  }
  return (
    <div className="field">
      <label>What can they see?</label>
      <div className="flex" style={{ flexWrap: 'wrap', gap: 8 }}>
        {MODULES.map(m => (
          <label key={m.key} className="pill-tab" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <input type="checkbox" style={{ width: 14, margin: 0 }} checked={selected.includes(m.key)} onChange={() => toggle(m.key)} />
            {m.label}
          </label>
        ))}
      </div>
      <p className="hint mt-6">Leave all unchecked and they won't see any modules in the sidebar — just the dashboard.</p>
    </div>
  )
}

export default function UsersPage() {
  const { isSuperadmin, user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [resetUser, setResetUser] = useState(null)
  const [resetVal, setResetVal] = useState('')
  const [resetError, setResetError] = useState('')
  const [accessUser, setAccessUser] = useState(null)
  const [accessModules, setAccessModules] = useState([])
  const [accessError, setAccessError] = useState('')
  const [listError, setListError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setListError('')
    const { data, error } = await supabase.rpc('admin_list_users')
    if (error) setListError(error.message)
    setUsers(data || [])
    setLoading(false)
  }

  function onNameChange(name) {
    setForm(f => ({
      ...f, name,
      username: usernameTouched ? f.username : name.trim().split(' ')[0].toLowerCase(),
    }))
  }

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true); setFormError('')
    const { error } = await supabase.rpc('admin_create_user', {
      p_name: form.name, p_email: form.email || null, p_role: form.role,
      p_crew: form.crew || null, p_password: form.password,
      p_modules: form.role === 'crew' ? form.modules : [],
      p_username: form.role === 'crew' ? form.username : null,
    })
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setAddOpen(false); setForm(BLANK); setUsernameTouched(false); load()
  }

  async function toggleActive(u) {
    const { error } = await supabase.rpc('admin_update_user', {
      p_id: u.id, p_name: u.name, p_email: u.email, p_role: u.role, p_crew: u.crew, p_active: !u.active,
    })
    if (error) { setListError(error.message); return }
    load()
  }

  async function handleReset(e) {
    e.preventDefault()
    setSaving(true); setResetError('')
    const { error } = await supabase.rpc('admin_reset_credential', { p_id: resetUser.id, p_role: resetUser.role, p_password: resetVal })
    setSaving(false)
    if (error) { setResetError(error.message); return }
    setResetUser(null); setResetVal('')
  }

  function openAccess(u) { setAccessUser(u); setAccessModules(u.modules || []); setAccessError('') }

  async function handleSaveAccess(e) {
    e.preventDefault()
    setSaving(true); setAccessError('')
    const { error } = await supabase.rpc('admin_update_user', {
      p_id: accessUser.id, p_name: accessUser.name, p_email: accessUser.email,
      p_role: accessUser.role, p_crew: accessUser.crew, p_active: accessUser.active,
      p_modules: accessModules,
    })
    setSaving(false)
    if (error) { setAccessError(error.message); return }
    setAccessUser(null); load()
  }

  const officeUsers = users.filter(u => u.role !== 'crew')
  const crewUsers = users.filter(u => u.role === 'crew')

  function renderRow(u) {
    return (
      <tr key={u.id}>
        <td className="cell-strong">{u.name}</td>
        <td className="cell-muted">{u.role === 'crew' ? (u.username || '—') : (u.email || '—')}</td>
        <td><span className="badge badge-neutral">{u.role}</span></td>
        <td>{u.crew || '—'}</td>
        <td>
          {u.role !== 'crew' ? (
            <span className="badge badge-stocked">All modules</span>
          ) : (u.modules || []).length === 0 ? (
            <span className="badge badge-out">None yet</span>
          ) : (
            <span className="text-xs text-muted">{(u.modules || []).length} module{(u.modules || []).length === 1 ? '' : 's'}</span>
          )}
        </td>
        <td>{u.active ? <span className="badge badge-active">Active</span> : <span className="badge badge-retired">Disabled</span>}</td>
        <td>
          <div className="flex gap-6">
            {u.role === 'crew' && (
              <button className="icon-btn" title="Edit access" onClick={() => openAccess(u)}><ShieldCheck size={14} /></button>
            )}
            <button className="icon-btn" title="Reset PIN/password" onClick={() => { setResetUser(u); setResetVal(''); setResetError('') }}><KeyRound size={14} /></button>
            {!(u.role === 'superadmin' && u.id !== me.id) && (
              <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(u)}>{u.active ? 'Disable' : 'Enable'}</button>
            )}
          </div>
        </td>
      </tr>
    )
  }

  function renderCard(u) {
    return (
      <div className="row-card" key={u.id}>
        <div className="row-card-top">
          <b>{u.name}</b>
          {u.active ? <span className="badge badge-active">Active</span> : <span className="badge badge-retired">Disabled</span>}
        </div>
        <div className="row-card-line"><span>Login</span><b>{u.role === 'crew' ? (u.username || '—') : (u.email || '—')}</b></div>
        <div className="row-card-line"><span>Role</span><b>{u.role}</b></div>
        <div className="row-card-line"><span>Crew</span><b>{u.crew || '—'}</b></div>
        <div className="row-card-line">
          <span>Access</span>
          <b>
            {u.role !== 'crew' ? 'All modules'
              : (u.modules || []).length === 0 ? 'None yet'
              : `${(u.modules || []).length} module${(u.modules || []).length === 1 ? '' : 's'}`}
          </b>
        </div>
        <div className="flex gap-6 mt-10">
          {u.role === 'crew' && (
            <button className="btn btn-ghost btn-sm w-full" onClick={() => openAccess(u)}><ShieldCheck size={13} /> Access</button>
          )}
          <button className="btn btn-ghost btn-sm w-full" onClick={() => { setResetUser(u); setResetVal(''); setResetError('') }}><KeyRound size={13} /> Reset</button>
          {!(u.role === 'superadmin' && u.id !== me.id) && (
            <button className="btn btn-ghost btn-sm w-full" onClick={() => toggleActive(u)}>{u.active ? 'Disable' : 'Enable'}</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted mb-16">
        Office/admin accounts log in with email + password and always see every module.
        Crew log in with a username + a 4-digit PIN and only see what's checked off below.
      </p>

      {listError && <p className="error-text mb-16">Couldn't load users: {listError}. (If you just added a new migration, make sure you ran it in Supabase's SQL Editor.)</p>}

      <div className="filters-bar">
        <div className="spacer" />
        <button className="btn btn-gold" onClick={() => { setForm(BLANK); setUsernameTouched(false); setFormError(''); setAddOpen(true) }}><Plus size={15} /> Add User</button>
      </div>

      {loading ? <p className="text-muted">Loading…</p> : users.length === 0 ? (
        <EmptyState icon={<UsersIcon size={36} />} title="No users yet" />
      ) : (
        <>
          <div className="section-divider-label">Office &amp; Admin</div>
          {officeUsers.length === 0 ? (
            <p className="text-muted text-sm mb-16">No office/admin accounts yet.</p>
          ) : (
            <>
              <div className="table-wrap mb-16 hide-mobile">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Username / Email</th><th>Role</th><th>Crew</th><th>Access</th><th>Status</th><th></th></tr></thead>
                  <tbody>{officeUsers.map(renderRow)}</tbody>
                </table>
              </div>
              <div className="card-list show-mobile mb-16">{officeUsers.map(renderCard)}</div>
            </>
          )}

          <div className="section-divider-label">Crew</div>
          {crewUsers.length === 0 ? (
            <p className="text-muted text-sm">No crew accounts yet.</p>
          ) : (
            <>
              <div className="table-wrap hide-mobile">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Username / Email</th><th>Role</th><th>Crew</th><th>Access</th><th>Status</th><th></th></tr></thead>
                  <tbody>{crewUsers.map(renderRow)}</tbody>
                </table>
              </div>
              <div className="card-list show-mobile">{crewUsers.map(renderCard)}</div>
            </>
          )}
        </>
      )}

      {addOpen && (
        <Modal title="Add User" onClose={() => setAddOpen(false)} width="560px">
          <form onSubmit={handleAdd}>
            <div className="field"><label>Full Name</label>
              <input value={form.name} onChange={e => onNameChange(e.target.value)} placeholder="e.g. Andrew Martinez" required />
            </div>
            <div className="field"><label>Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="crew">Crew (username + PIN)</option>
                <option value="admin">Admin (email + password)</option>
                {isSuperadmin && <option value="superadmin">Superadmin (email + password)</option>}
              </select>
            </div>
            {form.role === 'crew' ? (
              <div className="field"><label>Username (what they log in with)</label>
                <input
                  value={form.username}
                  onChange={e => { setUsernameTouched(true); setForm({ ...form, username: e.target.value }) }}
                  placeholder="e.g. andrew" required
                />
                <p className="hint">Auto-filled from their first name — change it if you want something different.</p>
              </div>
            ) : (
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
            {form.role === 'crew' && (
              <ModuleCheckboxes selected={form.modules} onChange={(modules) => setForm({ ...form, modules })} />
            )}
            {formError && <p className="error-text mb-10">{formError}</p>}
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
            {resetError && <p className="error-text mb-10">{resetError}</p>}
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setResetUser(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {accessUser && (
        <Modal title={`Edit Access — ${accessUser.name}`} onClose={() => setAccessUser(null)} width="520px">
          <form onSubmit={handleSaveAccess}>
            <ModuleCheckboxes selected={accessModules} onChange={setAccessModules} />
            {accessError && <p className="error-text mb-10">{accessError}</p>}
            <div className="flex justify-between gap-10 mt-16">
              <button type="button" className="btn btn-ghost" onClick={() => setAccessUser(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Access'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
