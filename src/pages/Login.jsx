import { useState } from 'react'
import { Wrench, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [mode, setMode] = useState('crew') // 'crew' | 'office'
  const [identifier, setIdentifier] = useState('')
  const [credential, setCredential] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !credential.trim()) {
      setError('Fill in both fields.')
      return
    }
    setLoading(true)
    const res = await login(identifier, credential)
    setLoading(false)
    if (!res.ok) setError(res.message)
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-mark"><Wrench size={26} /></div>
          <h2>Macario Brothers</h2>
          <p>Equipment &amp; Inventory Tracker</p>
        </div>

        <div className="login-toggle">
          <button className={mode === 'crew' ? 'active' : ''} onClick={() => { setMode('crew'); setError('') }} type="button">
            Crew (Name + PIN)
          </button>
          <button className={mode === 'office' ? 'active' : ''} onClick={() => { setMode('office'); setError('') }} type="button">
            Office Login
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>{mode === 'crew' ? 'Your name' : 'Email'}</label>
            <input
              type={mode === 'crew' ? 'text' : 'email'}
              placeholder={mode === 'crew' ? 'e.g. Alberto' : 'office@macariobros.com'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label>{mode === 'crew' ? '4-digit PIN' : 'Password'}</label>
            <input
              type="password"
              inputMode={mode === 'crew' ? 'numeric' : 'text'}
              placeholder={mode === 'crew' ? '••••' : '••••••••'}
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="error-text mb-10">{error}</p>}
          <button className="btn btn-primary login-submit" disabled={loading} type="submit">
            {loading ? <Loader2 size={16} className="spin" /> : null}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="login-footer">Macario Brothers Lawn Care · San Antonio, TX</p>
      </div>
    </div>
  )
}
