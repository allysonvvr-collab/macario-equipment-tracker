import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Equipment from './pages/Equipment'
import EquipmentDetail from './pages/EquipmentDetail'
import RepairLog from './pages/RepairLog'
import ShopStatus from './pages/ShopStatus'
import MowerHours from './pages/MowerHours'
import Inventory from './pages/Inventory'
import Checkout from './pages/Checkout'
import FwcTracker from './pages/FwcTracker'
import Orders from './pages/Orders'
import Fleet from './pages/Fleet'
import FleetVehicleDetail from './pages/FleetVehicleDetail'
import UsersPage from './pages/Users'

// Wraps a page so visiting the URL directly respects the same module
// permissions as the sidebar — not just hiding the nav link.
function Guard({ moduleKey, children }) {
  const { canAccess } = useAuth()
  return canAccess(moduleKey) ? children : <Navigate to="/" replace />
}

export default function App() {
  const { user, loading, isAdmin } = useAuth()

  if (loading) return null

  if (!user) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/equipment" element={<Guard moduleKey="equipment"><Equipment /></Guard>} />
        <Route path="/equipment/:id" element={<Guard moduleKey="equipment"><EquipmentDetail /></Guard>} />
        <Route path="/repairs" element={<Guard moduleKey="repairs"><RepairLog /></Guard>} />
        <Route path="/shop-status" element={<Guard moduleKey="shop_status"><ShopStatus /></Guard>} />
        <Route path="/hours" element={<Guard moduleKey="hours"><MowerHours /></Guard>} />
        <Route path="/inventory" element={<Guard moduleKey="inventory"><Inventory /></Guard>} />
        <Route path="/checkout" element={<Guard moduleKey="checkout"><Checkout /></Guard>} />
        <Route path="/fwc" element={<Guard moduleKey="fwc"><FwcTracker /></Guard>} />
        <Route path="/orders" element={<Guard moduleKey="orders"><Orders /></Guard>} />
        <Route path="/fleet" element={<Guard moduleKey="fleet"><Fleet /></Guard>} />
        <Route path="/fleet/:id" element={<Guard moduleKey="fleet"><FleetVehicleDetail /></Guard>} />
        <Route path="/users" element={isAdmin ? <UsersPage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
