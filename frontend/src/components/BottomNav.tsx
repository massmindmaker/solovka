import { NavLink } from 'react-router-dom'
import { cn } from '@/utils'
import { useCartStore } from '@/store/cartStore'

const NAV_ITEMS = [
  { to: '/',        icon: '🍽', label: 'Меню',    exact: true  },
  { to: '/cart',    icon: '🛒', label: 'Корзина', exact: false },
  { to: '/orders',  icon: '📋', label: 'Заказы',  exact: false },
  { to: '/profile', icon: '👤', label: 'Профиль', exact: false },
]

export default function BottomNav() {
  const totalCount = useCartStore((s) => s.totalCount())

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--tg-theme-bg-color)] border-t border-[var(--tg-theme-secondary-bg-color)]">
      <div className="flex items-stretch h-16 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ to, icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
                isActive
                  ? 'text-[var(--tg-theme-button-color)]'
                  : 'text-[var(--tg-theme-hint-color)]',
              )
            }
          >
            <div className="relative">
              <span className="text-2xl leading-none">{icon}</span>
              {to === '/cart' && totalCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
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
