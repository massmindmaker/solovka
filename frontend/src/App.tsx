import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useTelegram } from '@/hooks/useTelegram'
import { useUserStore } from '@/store/userStore'
import { fetchProfile } from '@/api/profile'
import { FullScreenSpinner } from '@/components/Spinner'
import BottomNav from '@/components/BottomNav'

import MenuPage from '@/pages/Menu/MenuPage'
import ItemPage from '@/pages/Item/ItemPage'
import CartPage from '@/pages/Cart/CartPage'
import CheckoutPage from '@/pages/Checkout/CheckoutPage'
import OrderSuccessPage from '@/pages/OrderSuccess/OrderSuccessPage'
import OrdersPage from '@/pages/Orders/OrdersPage'
import ProfilePage from '@/pages/Profile/ProfilePage'
import TalonsPage from '@/pages/Talons/TalonsPage'

// Страницы без BottomNav — не нужен нижний паддинг
const NO_NAV_PATTERNS = ['/item/', '/checkout', '/order-success/']

function AppContent() {
  const { tg } = useTelegram()
  const { loading, setProfile, setLoading } = useUserStore()
  const { pathname } = useLocation()

  const hideNav = NO_NAV_PATTERNS.some((p) => pathname.startsWith(p))

  useEffect(() => {
    tg.ready()
    tg.expand()

    fetchProfile()
      .then(setProfile)
      .catch((err) => {
        console.error('Failed to load profile:', err)
        setLoading(false)
      })
  }, [tg, setProfile, setLoading])

  if (loading) return <FullScreenSpinner />

  return (
    <div className="flex flex-col min-h-screen min-h-dvh bg-[var(--tg-theme-bg-color)]">
      <main className={`flex-1 ${hideNav ? '' : 'pb-16'}`}>
        <Routes>
          <Route path="/" element={<MenuPage />} />
          <Route path="/item/:id" element={<ItemPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success/:id" element={<OrderSuccessPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/talons" element={<TalonsPage />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
