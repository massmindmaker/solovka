import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/utils'

const TABS = [
  { path: '/admin/orders', label: 'Заказы', icon: '📋' },
  { path: '/admin/menu', label: 'Меню', icon: '🍽' },
  { path: '/admin/daily', label: 'Меню дня', icon: '📅' },
  { path: '/admin/stats', label: 'Аналитика', icon: '📊' },
] as const

export default function AdminNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const activePath =
    TABS.find((t) => pathname.startsWith(t.path))?.path ??
    '/admin/orders'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        {TABS.map((tab) => {
          const active = activePath === tab.path
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 transition-colors min-h-[52px]',
                active ? 'text-emerald-600' : 'text-gray-400',
              )}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
