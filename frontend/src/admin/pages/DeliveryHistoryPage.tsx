import { useState, useEffect, useCallback } from 'react'
import { fetchDeliveryHistory, type DeliveryOrder, type DeliveryHistoryResponse } from '../api/delivery'
import { formatPrice, formatDateTime, cn } from '@/utils'
import { FullScreenSpinner } from '@/components/Spinner'
import ErrorState from '@/components/ErrorState'

export default function DeliveryHistoryPage() {
  const [data, setData] = useState<DeliveryHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadHistory = useCallback(async () => {
    try {
      setError(false)
      const result = await fetchDeliveryHistory()
      setData(result)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">История</h1>
        <p className="text-sm text-gray-400 mt-0.5">Доставки за сегодня</p>
      </header>

      <div className="flex-1 px-4 py-3 pb-20">
        {error ? (
          <ErrorState
            title="Ошибка загрузки"
            description="Не удалось загрузить историю"
            onRetry={loadHistory}
          />
        ) : loading ? (
          <FullScreenSpinner />
        ) : !data || data.orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Пока нет доставок</p>
            <p className="text-sm text-gray-400">Доставленные заказы появятся здесь</p>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={data.stats.total} label="Всего" icon="📦" />
              <StatCard value={data.stats.delivered} label="Доставлено" icon="✅" />
              <StatCard value={data.stats.inProgress} label="В пути" icon="🚗" />
            </div>

            {/* Order list */}
            <div className="space-y-2.5">
              {data.orders.map((order) => (
                <HistoryCard key={order.id} order={order} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────

function StatCard({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl px-3 py-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="text-xl mb-0.5">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

// ─── History Card ────────────────────────────────────────

function HistoryCard({ order }: { order: DeliveryOrder }) {
  const customerName = [order.customerFirstName, order.customerLastName]
    .filter(Boolean)
    .join(' ')

  const isDelivered = order.status === 'delivered'

  return (
    <div className="bg-white rounded-xl px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">#{order.id}</span>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              isDelivered ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700',
            )}
          >
            {isDelivered ? 'Доставлен' : 'В пути'}
          </span>
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {formatPrice(order.totalKopecks)}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>📍 {order.deliveryAddress}</span>
        <span>👤 {customerName}</span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
        <span>🕐 {order.deliveryTime}</span>
        {order.updatedAt && (
          <span>{formatDateTime(order.updatedAt)}</span>
        )}
      </div>
    </div>
  )
}
