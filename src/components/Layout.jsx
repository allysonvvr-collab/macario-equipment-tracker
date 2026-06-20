import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Wrench, ClipboardList, Truck, Clock, Package,
  ArrowRightLeft, Users, Menu, LogOut, Tractor, Droplets, Package2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/equipment': 'All Equipment',
  '/repairs': 'Repair Log',
  '/shop-status': 'Shop Status',
  '/hours': 'Mower Hours',
  '/inventory': 'Inventory & Parts',
  '/checkout': 'Equipment Checkout',
  '/fwc': 'FWC Chemical Tracker',
  '/orders': 'Orders',
  '/users': 'Users & Logins',
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [counts, setCounts] = useState({ atShop: 0, lowStock: 0, pendingOrders: 0 })
  const location = useLocation()

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  useEffect(() => {
    loadCounts()
    function onFocus() { loadCounts() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  async function loadCounts() {
    const { count: shopCount } = await supabase
      .from('repair_log').select('id', { count: 'exact', head: true })
      .in('status', ['At Shop', 'Waiting on Parts'])
    const { data: parts } = await supabase.from('parts_catalog').select('on_hand, reorder_point').eq('active', true)
    const low = (parts || []).filter(p => Number(p.on_hand) <= Number(p.reorder_point)).length
    const { count: pendingOrders } = await supabase
      .from('orders').select('id', { count: 'exact', head: true }).neq('status', 'Received')
    setCounts({ atShop: shopCount || 0, lowStock: low, pendingOrders: pendingOrders || 0 })
  }

  const opsItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/equipment', label: 'All Equipment', icon: Tractor },
    { to: '/repairs', label: 'Repair Log', icon: Wrench },
    { to: '/shop-status', label: 'Shop Status', icon: ClipboardList, count: counts.atShop },
    { to: '/hours', label: 'Mower Hours', icon: Clock },
    { to: '/inventory', label: 'Inventory & Parts', icon: Package, count: counts.lowStock },
    { to: '/checkout', label: 'Checkout Log', icon: ArrowRightLeft },
  ]
  const fieldItems = [
    { to: '/fwc', label: 'FWC Tracker', icon: Droplets },
    { to: '/orders', label: 'Orders', icon: Package2, count: counts.pendingOrders },
  ]

  const title = PAGE_TITLES[location.pathname] || 'Macario Brothers'

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`sidebar ${drawerOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">MB</div>
          <div className="sidebar-brand-text">
            <div className="top">MACARIO BROS</div>
            <div className="sub">Equipment Tracker</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Operations</div>
          {opsItems.map(({ to, label, icon: Icon, count }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} />
              {label}
              {!!count && <span className="badge-count">{count}</span>}
            </NavLink>
          ))}

          <div className="sidebar-section-label">Field &amp; Orders</div>
          {fieldItems.map(({ to, label, icon: Icon, count }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} />
              {label}
              {!!count && <span className="badge-count">{count}</span>}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="sidebar-section-label">Admin</div>
              <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Users size={16} /> Users &amp; Logins
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
            <div>
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}><LogOut size={14} /> Log out</button>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="flex items-center gap-10">
            <button className="menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
            <div>
              <h1>{title}</h1>
              <div className="topbar-sub hide-mobile">Hey {user?.name} — here's what's going on today</div>
            </div>
          </div>
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Truck size={16} color="var(--gray-400)" />
            <span className="text-sm text-muted">San Antonio, TX</span>
          </div>
        </header>
        <main className="page">
          <Outlet context={{ refreshCounts: loadCounts }} />
        </main>
      </div>
    </div>
  )
}
