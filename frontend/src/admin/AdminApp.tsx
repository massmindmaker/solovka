import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTelegram } from '@/hooks/useTelegram'
import { api } from '@/api/client'
import { FullScreenSpinner } from '@/components/Spinner'
import type { UserRole, UserProfile } from '@/types'
import AdminNav from './components/AdminNav'
import DeliveryNav from './components/DeliveryNav'
import AdminOrdersPage from './pages/AdminOrdersPage'
import AdminMenuPage from './pages/AdminMenuPage'
import AdminDailyMenuPage from './pages/AdminDailyMenuPage'
import AdminStatsPage from './pages/AdminStatsPage'
import DeliveryOrdersPage from './pages/DeliveryOrdersPage'
import DeliveryHistoryPage from './pages/DeliveryHistoryPage'
import AccessDeniedPage from './pages/AccessDeniedPage'

function AdminContent() {
  const { tg } = useTelegram()
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tg.ready()
    tg.expand()

    api
      .get<UserProfile>('/users/me')
      .then((profile) => {
        setRole(profile.user.role)
      })
      .catch((err) => {
        console.error('Failed to load profile:', err)
        setRole('customer') // no access
      })
      .finally(() => setLoading(false))
  }, [tg])

  if (loading) return <FullScreenSpinner />

  if (role === 'customer' || !role) {
    return <AccessDeniedPage />
  }

  // Admin routes
  if (role === 'admin') {
    return (
      <div className="flex flex-col min-h-screen min-h-dvh bg-gray-50">
        <main className="flex-1 pb-16">
          <Routes>
            <Route path="/admin" element={<AdminOrdersPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/menu" element={<AdminMenuPage />} />
            <Route path="/admin/daily" element={<AdminDailyMenuPage />} />
            <Route path="/admin/stats" element={<AdminStatsPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
        <AdminNav />
      </div>
    )
  }

  // Delivery routes
  return (
    <div className="flex flex-col min-h-screen min-h-dvh bg-gray-50">
      <main className="flex-1 pb-16">
        <Routes>
          <Route path="/admin" element={<DeliveryOrdersPage />} />
          <Route path="/admin/history" element={<DeliveryHistoryPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
      <DeliveryNav />
    </div>
  )
}

export default function AdminApp() {
  return (
    <BrowserRouter>
      <AdminContent />
    </BrowserRouter>
  )
}
