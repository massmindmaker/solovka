import { useState, useEffect, useCallback } from 'react'
import { fetchStats, type StatsResponse } from '../api/admin'
import { formatPrice, cn } from '@/utils'
import { FullScreenSpinner } from '@/components/Spinner'
import ErrorState from '@/components/ErrorState'

type Period = 'day' | 'week' | 'month'

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Сегодня',
  week: 'Неделя',
  month: 'Месяц',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  paid: 'Оплачен',
  preparing: 'Готовится',
  ready: 'Готов',
  delivering: 'Доставляется',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Картой',
  coupon: 'Купоном',
  subscription: 'Подписка',
}

export default function AdminStatsPage() {
  const [data, setData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState<Period>('week')

  const loadStats = useCallback(async () => {
    try {
      setError(false)
      const result = await fetchStats(period)
      setData(result)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    setLoading(true)
    loadStats()
  }, [loadStats])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white px-4 pt-4 pb-3">
        <h1 className="text-[28px] font-bold text-gray-900 tracking-tight mb-3">Аналитика</h1>

        {/* Period tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400',
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-4 py-3 pb-20">
        {error ? (
          <ErrorState
            title="Ошибка загрузки"
            description="Не удалось загрузить статистику"
            onRetry={loadStats}
          />
        ) : loading || !data ? (
          <FullScreenSpinner />
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Revenue cards */}
            <div className="grid grid-cols-3 gap-3">
              <BigStatCard
                value={formatPrice(data.revenue.total)}
                label="Выручка"
                icon="💰"
              />
              <BigStatCard
                value={String(data.revenue.orderCount)}
                label="Заказов"
                icon="📦"
              />
              <BigStatCard
                value={formatPrice(data.revenue.avgCheck)}
                label="Ср. чек"
                icon="📊"
              />
            </div>

            {/* Daily revenue chart (simple bar) */}
            {data.dailyRevenue.length > 0 && (
              <Section title="Выручка по дням">
                <div className="bg-white rounded-xl p-4">
                  <MiniBarChart data={data.dailyRevenue} />
                </div>
              </Section>
            )}

            {/* Top dishes */}
            {data.topDishes.length > 0 && (
              <Section title="Топ блюд">
                <div className="bg-white rounded-xl overflow-hidden">
                  {data.topDishes.map((dish, i) => (
                    <div
                      key={dish.itemName}
                      className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                    >
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{dish.itemName}</p>
                        <p className="text-xs text-gray-400">{dish.totalQuantity} шт.</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatPrice(dish.totalRevenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Payment methods */}
            {data.paymentMethods.length > 0 && (
              <Section title="Способы оплаты">
                <div className="bg-white rounded-xl p-4 space-y-2">
                  {data.paymentMethods.map((pm) => {
                    const total = data.paymentMethods.reduce((s, p) => s + p.count, 0)
                    const pct = total > 0 ? Math.round((pm.count / total) * 100) : 0
                    return (
                      <div key={pm.method}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">
                            {PAYMENT_LABELS[pm.method] ?? pm.method}
                          </span>
                          <span className="text-gray-500">{pm.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* Orders by status */}
            {data.ordersByStatus.length > 0 && (
              <Section title="Заказы по статусу">
                <div className="bg-white rounded-xl p-4">
                  <div className="flex flex-wrap gap-2">
                    {data.ordersByStatus.map((s) => (
                      <div
                        key={s.status}
                        className="bg-gray-50 rounded-lg px-3 py-2 text-center"
                      >
                        <p className="text-lg font-bold text-gray-900">{s.count}</p>
                        <p className="text-xs text-gray-400">
                          {STATUS_LABELS[s.status] ?? s.status}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {/* Courier stats */}
            {data.courierStats.length > 0 && (
              <Section title="Курьеры">
                <div className="bg-white rounded-xl overflow-hidden">
                  {data.courierStats.map((c) => {
                    const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
                    return (
                      <div
                        key={name}
                        className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🚗</span>
                          <span className="text-sm font-medium text-gray-900">{name}</span>
                        </div>
                        <span className="text-sm text-gray-500">{c.deliveryCount} доставок</span>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helper components ───────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
        {title}
      </p>
      {children}
    </div>
  )
}

function BigStatCard({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl px-3 py-3.5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="text-lg mb-0.5">{icon}</div>
      <div className="text-base font-bold text-gray-900 leading-tight">{value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

function MiniBarChart({ data }: { data: { date: string; revenue: number; orders: number }[] }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)

  return (
    <div className="flex items-end gap-1" style={{ height: 80 }}>
      {data.map((d) => {
        const h = Math.max(4, Math.round((d.revenue / maxRevenue) * 72))
        const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
        })
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-emerald-500 rounded-t-sm transition-all"
              style={{ height: h }}
              title={`${dayLabel}: ${formatPrice(d.revenue)} (${d.orders} зак.)`}
            />
            <span className="text-[9px] text-gray-400 leading-none">{dayLabel.split(' ')[0]}</span>
          </div>
        )
      })}
    </div>
  )
}
