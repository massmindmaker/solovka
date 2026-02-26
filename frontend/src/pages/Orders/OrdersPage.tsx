import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchOrders } from '@/api/orders'
import { formatPrice, formatDateTime, ACTIVE_ORDER_STATUSES } from '@/utils'
import { useRepeatOrder } from '@/hooks/useRepeatOrder'
import EmptyState from '@/components/EmptyState'
import ErrorState from '@/components/ErrorState'
import StatusBadge from '@/components/StatusBadge'
import PullToRefresh from '@/components/PullToRefresh'
import { OrdersSkeleton } from '@/components/Skeleton'
import type { Order } from '@/types'

type Tab = 'active' | 'history'

interface OrderCardProps {
  order: Order
  onClick: () => void
  onRepeat?: () => void
  repeatLoading?: boolean
}

function OrderCard({ order, onClick, onRepeat, repeatLoading }: OrderCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden">
      <button
        onClick={onClick}
        className="w-full text-left p-4 space-y-3 active:bg-gray-50 transition-colors"
      >
        {/* Шапка: номер + статус */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-gray-900">#{order.id}</span>
          <StatusBadge status={order.status} />
        </div>

        {/* Позиции */}
        <div className="space-y-1">
          {order.items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-900 flex-1 mr-2 truncate">
                {item.itemName}
                {item.quantity > 1 && (
                  <span className="text-gray-400"> × {item.quantity}</span>
                )}
              </span>
              <span className="text-gray-500 whitespace-nowrap">
                {formatPrice(item.priceKopecks * item.quantity)}
              </span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-xs text-gray-400">
              + ещё {order.items.length - 3} поз.
            </p>
          )}
        </div>

        {/* Подвал: сумма + доставка */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>📍 {order.deliveryRoom}</span>
            <span>🕐 {order.deliveryTime}</span>
          </div>
          <span className="font-bold text-gray-900">
            {formatPrice(order.totalKopecks)}
          </span>
        </div>

        {/* Дата */}
        <p className="text-xs text-gray-400">
          {formatDateTime(order.createdAt)}
        </p>
      </button>

      {/* Кнопка "Повторить" — только для не-активных заказов */}
      {onRepeat && (
        <div className="px-4 pb-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRepeat()
            }}
            disabled={repeatLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-emerald-500 text-emerald-600 text-sm font-bold active:bg-emerald-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {repeatLoading ? 'Загрузка...' : 'Повторить заказ'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const { repeatOrder, loading: repeatLoading } = useRepeatOrder()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<Tab>('active')
  const [repeatError, setRepeatError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      setError(false)
      const data = await fetchOrders()
      setOrders(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const activeOrders = orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status))
  const historyOrders = orders.filter((o) => !ACTIVE_ORDER_STATUSES.includes(o.status))
  const shown = tab === 'active' ? activeOrders : historyOrders

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Шапка */}
      <header className="sticky top-0 z-10 bg-white px-4 pt-4 pb-0">
        <h1 className="text-[28px] font-bold text-gray-900 tracking-tight mb-3">Заказы</h1>

        {/* Табы */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <TabButton
            active={tab === 'active'}
            onClick={() => setTab('active')}
            label="Активные"
            badge={activeOrders.length > 0 ? activeOrders.length : undefined}
          />
          <TabButton
            active={tab === 'history'}
            onClick={() => setTab('history')}
            label="История"
          />
        </div>
      </header>

      {/* Контент */}
      <PullToRefresh onRefresh={loadOrders} className="flex-1 px-4 py-4">
        {error ? (
          <ErrorState
            title="Ошибка"
            description="Не удалось загрузить заказы"
            onRetry={loadOrders}
          />
        ) : loading ? (
          <OrdersSkeleton />
        ) : shown.length === 0 ? (
          <div className="flex items-center justify-center pt-8">
            {tab === 'active' ? (
              <EmptyState
                icon="🍽"
                title="Нет активных заказов"
                description="Сделайте заказ, чтобы он появился здесь"
                action={
                  <button
                    onClick={() => navigate('/')}
                    className="mt-2 text-emerald-600 font-medium"
                  >
                    Перейти в меню →
                  </button>
                }
              />
            ) : (
              <EmptyState
                icon="📋"
                title="История пуста"
                description="Завершённые заказы будут здесь"
              />
            )}
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {repeatError && (
              <div className="bg-red-50 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
                {repeatError}
              </div>
            )}
            {shown.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => navigate(`/orders/${order.id}`)}
                onRepeat={tab === 'history' ? async () => {
                  setRepeatError(null)
                  const result = await repeatOrder(order)
                  if (!result.success && result.message) {
                    setRepeatError(result.message)
                  }
                } : undefined}
                repeatLoading={repeatLoading}
              />
            ))}
          </div>
        )}
      </PullToRefresh>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  label: string
  badge?: number
}

function TabButton({ active, onClick, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5',
        active
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-400',
      ].join(' ')}
    >
      {label}
      {badge !== undefined && (
        <span className="min-w-[18px] h-[18px] rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </button>
  )
}
