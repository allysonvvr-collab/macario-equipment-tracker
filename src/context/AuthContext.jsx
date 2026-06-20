import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)
const STORAGE_KEY = 'mb_equip_session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      // ignore corrupt storage
    }
    setLoading(false)
  }, [])

  async function login(identifier, credential) {
    const { data, error } = await supabase.rpc('verify_login', {
      p_identifier: identifier.trim(),
      p_credential: credential.trim(),
    })
    if (error) {
      console.error('Supabase login error:', error)
      return { ok: false, message: 'Something went wrong. Try again.' }
    }
    if (!data || data.length === 0) {
      return { ok: false, message: 'Name/email or PIN/password is incorrect.' }
    }
    const u = data[0]
    setUser(u)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    return { ok: true }
  }

  function logout() {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'
  const isSuperadmin = user?.role === 'superadmin'

  // Admin/superadmin always have full access. Crew is restricted to
  // whatever's in user.modules (set from the Users & Logins page).
  function canAccess(moduleKey) {
    if (!user) return false
    if (isAdmin) return true
    return Array.isArray(user.modules) && user.modules.includes(moduleKey)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isSuperadmin, canAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
