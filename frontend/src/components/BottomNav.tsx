import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/utils'
import { useCartStore } from '@/store/cartStore'

const NAV_ITEMS = [
  { to: '/',        icon: '🍽', label: 'Меню',    exact: true  },
  { to: '/cart',    icon: '🛒', label: 'Корзина', exact: false },
  { to: '/orders',  icon: '📋', label: 'Заказы',  exact: false },
  { to: '/profile', icon: '👤', label: 'Профиль', exact: false },
]

// Страницы, на которых BottomNav скрыт
const HIDDEN_PATTERNS = ['/item/', '/cart', '/checkout', '/order-success/', '/orders/']

export default function BottomNav() {
  const totalCount = useCartStore((s) => s.totalCount())
  const { pathname } = useLocation()

  if (HIDDEN_PATTERNS.some((p) => pathname.startsWith(p))) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="flex items-stretch h-16 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ to, icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                isActive
                  ? 'text-emerald-600'
                  : 'text-gray-400',
              )
            }
          >
            <div className="relative">
              <span className="text-2xl leading-none">{icon}</span>
              {to === '/cart' && totalCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white animate-bounce-in"
                      key={totalCount}
                >
                  {totalCount > 99 ? '99+' : totalCount}
                </span>
              )}
            </div>
            <span className="leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
