import { useState, useEffect, useCallback } from 'react'
import {
  fetchReadyOrders,
  pickupOrder,
  completeDelivery,
  type DeliveryOrder,
} from '../api/delivery'
import { formatPrice, cn } from '@/utils'
import { useTelegram } from '@/hooks/useTelegram'
import { FullScreenSpinner } from '@/components/Spinner'
import ErrorState from '@/components/ErrorState'

export default function DeliveryOrdersPage() {
  const { haptic } = useTelegram()
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      setError(false)
      const data = await fetchReadyOrders()
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

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchReadyOrders().then(setOrders).catch(() => {})
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  async function handlePickup(orderId: number) {
    setActionId(orderId)
    try {
      await pickupOrder(orderId)
      haptic.notificationOccurred('success')
      // Update locally — change to delivering
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: 'delivering' as const } : o,
        ),
      )
    } catch (err) {
      haptic.notificationOccurred('error')
      alert(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setActionId(null)
    }
  }

  async function handleComplete(orderId: number) {
    setActionId(orderId)
    try {
      await completeDelivery(orderId)
      haptic.notificationOccurred('success')
      // Remove from list
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    } catch (err) {
      haptic.notificationOccurred('error')
      alert(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setActionId(null)
    }
  }

  // Split into ready (to pick up) and delivering (in progress)
  const readyOrders = orders.filter((o) => o.status === 'ready')
  const deliveringOrders = orders.filter((o) => o.status === 'delivering')

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">Доставка</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {readyOrders.length > 0
            ? `${readyOrders.length} готов${readyOrders.length === 1 ? '' : 'ы'} к выдаче`
            : 'Нет заказов для доставки'}
        </p>
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
        ) : readyOrders.length === 0 && deliveringOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <div className="text-5xl mb-4">☕</div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Всё доставлено!</p>
            <p className="text-sm text-gray-400">Новые заказы появятся автоматически</p>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {/* In-progress deliveries (my active) */}
            {deliveringOrders.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2 px-1">
                  🚗 В доставке ({deliveringOrders.length})
                </p>
                <div className="space-y-3">
                  {deliveringOrders.map((order) => (
                    <DeliveryCard
                      key={order.id}
                      order={order}
                      actionLoading={actionId === order.id}
                      onComplete={() => handleComplete(order.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ready orders */}
            {readyOrders.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-green-600 mb-2 px-1">
                  ✅ Готовы к выдаче ({readyOrders.length})
                </p>
                <div className="space-y-3">
                  {readyOrders.map((order) => (
                    <DeliveryCard
                      key={order.id}
                      order={order}
                      actionLoading={actionId === order.id}
                      onPickup={() => handlePickup(order.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Delivery Card ───────────────────────────────────────

function DeliveryCard({
  order,
  actionLoading,
  onPickup,
  onComplete,
}: {
  order: DeliveryOrder
  actionLoading: boolean
  onPickup?: () => void
  onComplete?: () => void
}) {
  const customerName = [order.customerFirstName, order.customerLastName]
    .filter(Boolean)
    .join(' ')

  const isDelivering = order.status === 'delivering'

  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden',
        isDelivering && 'ring-2 ring-blue-500',
      )}
    >
      <div className="p-4 space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-lg">#{order.id}</span>
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              isDelivering
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700',
            )}>
              {isDelivering ? 'Доставляется' : 'Готов'}
            </span>
          </div>
          <span className="text-sm font-bold text-gray-900">
            {formatPrice(order.totalKopecks)}
          </span>
        </div>

        {/* Address — prominent */}
        <div className="bg-gray-50 rounded-xl px-3 py-2.5">
          <p className="text-xs text-gray-400 mb-0.5">Адрес доставки</p>
          <p className="text-base font-semibold text-gray-900">{order.deliveryAddress}</p>
        </div>

        {/* Time + customer */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            👤 {customerName}
          </span>
          <span className="text-gray-500 font-medium">
            🕐 {order.deliveryTime}
          </span>
        </div>

        {/* Items */}
        <div className="text-xs text-gray-400">
          {order.items.map((item, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {item.itemName}{item.quantity > 1 ? ` x${item.quantity}` : ''}
            </span>
          ))}
        </div>

        {order.comment && (
          <div className="text-xs text-gray-500 bg-yellow-50 rounded-lg px-3 py-2">
            💬 {order.comment}
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="px-4 pb-3">
        {onPickup && (
          <button
            onClick={onPickup}
            disabled={actionLoading}
            className="w-full py-3.5 rounded-xl bg-emerald-500 text-white text-base font-bold active:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {actionLoading ? 'Забираю...' : '📦 Забрать заказ'}
          </button>
        )}
        {onComplete && (
          <button
            onClick={onComplete}
            disabled={actionLoading}
            className="w-full py-3.5 rounded-xl bg-blue-500 text-white text-base font-bold active:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {actionLoading ? 'Завершаю...' : '🎉 Доставлено'}
          </button>
        )}
      </div>
    </div>
  )
}
