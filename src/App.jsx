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
import UsersPage from './pages/Users'

export default function App() {
  const { user, loading, isAdmin } = useAuth()

  if (loading) return null

  if (!user) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/equipment" element={<Equipment />} />
        <Route path="/equipment/:id" element={<EquipmentDetail />} />
        <Route path="/repairs" element={<RepairLog />} />
        <Route path="/shop-status" element={<ShopStatus />} />
        <Route path="/hours" element={<MowerHours />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/users" element={isAdmin ? <UsersPage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
