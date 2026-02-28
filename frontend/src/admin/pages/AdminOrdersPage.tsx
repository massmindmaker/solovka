import { useState, useEffect, useCallback } from 'react'
import { fetchAdminOrders, updateOrderStatus, type AdminOrder } from '../api/admin'
import { formatPrice, formatDateTime, cn } from '@/utils'
import { useTelegram } from '@/hooks/useTelegram'
import { FullScreenSpinner } from '@/components/Spinner'
import ErrorState from '@/components/ErrorState'
import type { OrderStatus } from '@/types'

type FilterTab = 'paid' | 'ready' | 'all'

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Ожидает',      cls: 'bg-yellow-100 text-yellow-700' },
  paid:       { label: 'Оплачен',      cls: 'bg-blue-100 text-blue-700' },
  preparing:  { label: 'Готовится',     cls: 'bg-orange-100 text-orange-700' },
  ready:      { label: 'Готов',         cls: 'bg-green-100 text-green-700' },
  delivering: { label: 'Доставляется',  cls: 'bg-blue-100 text-blue-700' },
  delivered:  { label: 'Доставлен',     cls: 'bg-gray-100 text-gray-500' },
  cancelled:  { label: 'Отменён',       cls: 'bg-red-100 text-red-500' },
}

export default function AdminOrdersPage() {
  const { haptic } = useTelegram()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('paid')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      setError(false)
      const status = filter === 'all' ? undefined : filter
      const data = await fetchAdminOrders(status)
      setOrders(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    setLoading(true)
    loadOrders()
  }, [loadOrders])

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAdminOrders(filter === 'all' ? undefined : filter)
        .then(setOrders)
        .catch(() => {})
    }, 15000)
    return () => clearInterval(timer)
  }, [filter])

  async function handleStatusChange(orderId: number, newStatus: OrderStatus) {
    setUpdatingId(orderId)
    try {
      await updateOrderStatus(orderId, newStatus)
      haptic.notificationOccurred('success')
      // Update locally
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      )
    } catch (err) {
      haptic.notificationOccurred('error')
      alert(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white px-4 pt-4 pb-0">
        <h1 className="text-[28px] font-bold text-gray-900 tracking-tight mb-3">Заказы</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-3">
          {([
            { id: 'paid' as FilterTab, label: 'Оплаченные' },
            { id: 'ready' as FilterTab, label: 'Готовые' },
            { id: 'all' as FilterTab, label: 'Все' },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                filter === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-4 py-3 pb-20">
        {error ? (
          <ErrorState
            title="Ошибка загрузки"
            description="Не удалось загрузить заказы"
            onRetry={loadOrders}
          />
        ) : loading ? (
          <FullScreenSpinner />
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 text-sm">Нет заказов в этой категории</p>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {orders.map((order) => (
              <AdminOrderCard
                key={order.id}
                order={order}
                updating={updatingId === order.id}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Order Card ──────────────────────────────────────────

function AdminOrderCard({
  order,
  updating,
  onStatusChange,
}: {
  order: AdminOrder
  updating: boolean
  onStatusChange: (orderId: number, status: OrderStatus) => void
}) {
  const badge = STATUS_BADGE[order.status] ?? STATUS_BADGE.pending
  const customerName = [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ')

  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">#{order.id}</span>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', badge.cls)}>
              {badge.label}
            </span>
          </div>
          <span className="text-xs text-gray-400">{formatDateTime(order.createdAt)}</span>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">👤</span>
          <span className="text-gray-900 font-medium">{customerName}</span>
          {order.customerUsername && (
            <span className="text-gray-400">@{order.customerUsername}</span>
          )}
        </div>

        {/* Items */}
        <div className="space-y-1">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-900 flex-1 mr-2 truncate">
                {item.itemName}
                {item.quantity > 1 && (
                  <span className="text-gray-400"> x {item.quantity}</span>
                )}
              </span>
              <span className="text-gray-500 whitespace-nowrap">
                {formatPrice(item.priceKopecks * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>📍 {order.deliveryAddress}</span>
            <span>🕐 {order.deliveryTime}</span>
          </div>
          <span className="font-bold text-gray-900">{formatPrice(order.totalKopecks)}</span>
        </div>

        {order.comment && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            💬 {order.comment}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {(order.status === 'paid' || order.status === 'preparing') && (
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => onStatusChange(order.id, 'ready')}
            disabled={updating}
            className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold active:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {updating ? '...' : '✅ Готово'}
          </button>
          <button
            onClick={() => onStatusChange(order.id, 'cancelled')}
            disabled={updating}
            className="py-3 px-4 rounded-xl bg-red-50 text-red-500 text-sm font-bold active:bg-red-100 transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      )}

      {order.status === 'ready' && (
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => onStatusChange(order.id, 'cancelled')}
            disabled={updating}
            className="py-3 px-4 rounded-xl bg-red-50 text-red-500 text-sm font-bold active:bg-red-100 transition-colors disabled:opacity-50"
          >
            Отменить
          </button>
        </div>
      )}
    </div>
  )
}
