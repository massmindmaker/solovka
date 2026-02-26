import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { fetchOrder } from '@/api/orders'
import { useMainButton } from '@/hooks/useMainButton'
import { useBackButton } from '@/hooks/useBackButton'
import { useTelegram } from '@/hooks/useTelegram'
import { formatPrice, formatDateTime, cn } from '@/utils'
import { FullScreenSpinner } from '@/components/Spinner'
import ErrorState from '@/components/ErrorState'
import type { Order, OrderStatus } from '@/types'

// ─── Шаги статуса (pipeline) ─────────────────────────────

const STATUS_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'pending',   label: 'Принят',    icon: '📋' },
  { status: 'paid',      label: 'Оплачен',   icon: '💳' },
  { status: 'preparing', label: 'Готовится', icon: '👨‍🍳' },
  { status: 'ready',     label: 'Готов',     icon: '✅' },
  { status: 'delivered', label: 'Доставлен', icon: '🎉' },
]

const STATUS_ORDER: OrderStatus[] = ['pending', 'paid', 'preparing', 'ready', 'delivered']

function getStepIndex(status: OrderStatus): number {
  return STATUS_ORDER.indexOf(status)
}

// ─── Stepper компонент ────────────────────────────────────

function OrderStepper({ status }: { status: OrderStatus }) {
  const currentIdx = getStepIndex(status)
  const isCancelled = status === 'cancelled'

  if (isCancelled) {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <span className="text-3xl">❌</span>
        <span className="text-base font-semibold text-red-500">Заказ отменён</span>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center">
        {STATUS_STEPS.map((step, idx) => {
          const isDone = idx < currentIdx
          const isActive = idx === currentIdx
          const isLast = idx === STATUS_STEPS.length - 1

          return (
            <div key={step.status} className="flex items-center flex-1 last:flex-none">
              {/* Точка */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-500',
                  isDone
                    ? 'bg-green-500 text-white shadow-sm'
                    : isActive
                      ? 'bg-emerald-500 text-white shadow-md ring-4 ring-emerald-500/20 animate-pulse-once'
                      : 'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-hint-color)]',
                )}>
                  {isDone ? '✓' : step.icon}
                </div>
                <span className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  isActive
                    ? 'text-emerald-600'
                    : isDone
                      ? 'text-green-600'
                      : 'text-[var(--tg-theme-hint-color)]',
                )}>
                  {step.label}
                </span>
              </div>

              {/* Линия между шагами */}
              {!isLast && (
                <div className={cn(
                  'flex-1 h-0.5 mx-1 transition-all duration-500',
                  idx < currentIdx ? 'bg-green-500' : 'bg-[var(--tg-theme-secondary-bg-color)]',
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Строка позиции ───────────────────────────────────────

function OrderItemRow({ name, quantity, priceKopecks }: {
  name: string; quantity: number; priceKopecks: number
}) {
  return (
    <div className="flex justify-between items-start gap-2 py-2 border-b border-[var(--tg-theme-secondary-bg-color)] last:border-0">
      <span className="text-sm text-[var(--tg-theme-text-color)] flex-1 leading-snug">
        {name}
        {quantity > 1 && (
          <span className="text-[var(--tg-theme-hint-color)]"> × {quantity}</span>
        )}
      </span>
      <span className="text-sm font-semibold text-[var(--tg-theme-text-color)] whitespace-nowrap">
        {formatPrice(priceKopecks * quantity)}
      </span>
    </div>
  )
}

// ─── Главный компонент ────────────────────────────────────

const POLL_INTERVAL_MS = 12000 // обновлять статус каждые 12 сек
const FINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled']

export default function OrderSuccessPage({ mode = 'success' }: { mode?: 'success' | 'detail' }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { haptic } = useTelegram()
  const isDetail = mode === 'detail'

  // Получаем заказ из nav state (от CheckoutPage) или загружаем по API
  const [order, setOrder] = useState<Order | null>(
    (location.state as { order?: Order })?.order ?? null
  )
  const [loading, setLoading] = useState(!order)
  const [error, setError] = useState(false)
  const prevStatusRef = useRef<OrderStatus | null>(order?.status ?? null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Back button для detail-режима
  useBackButton(isDetail)

  // Первичная загрузка если нет в state
  useEffect(() => {
    if (!id) return
    if (order) {
      if (!isDetail) haptic.notificationOccurred('success')
      return
    }
    fetchOrder(Number(id))
      .then((data) => {
        setOrder(data)
        if (!isDetail) haptic.notificationOccurred('success')
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Polling статуса заказа
  useEffect(() => {
    if (!order || FINAL_STATUSES.includes(order.status)) return

    pollingRef.current = setInterval(async () => {
      try {
        const updated = await fetchOrder(Number(id))
        setOrder(updated)

        // Вибрация при смене статуса
        if (prevStatusRef.current && prevStatusRef.current !== updated.status) {
          haptic.notificationOccurred('success')
          prevStatusRef.current = updated.status
        }

        // Остановить polling на финальных статусах
        if (FINAL_STATUSES.includes(updated.status)) {
          clearInterval(pollingRef.current!)
        }
      } catch {
        // Игнорируем ошибки поллинга — попробуем снова через интервал
      }
    }, POLL_INTERVAL_MS)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [order?.status, id]) // eslint-disable-line react-hooks/exhaustive-deps

  useMainButton({
    text: 'Вернуться в меню',
    onClick: () => navigate('/', { replace: true }),
    visible: !isDetail,
  })

  if (loading) return <FullScreenSpinner />
  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <ErrorState
        title="Заказ не найден"
        description="Не удалось загрузить информацию о заказе"
        onRetry={() => {
          setError(false)
          setLoading(true)
          fetchOrder(Number(id))
            .then(setOrder)
            .catch(() => setError(true))
            .finally(() => setLoading(false))
        }}
      />
    </div>
  )
  if (!order) return null

  const isActive = !FINAL_STATUSES.includes(order.status)

  return (
    <div className="flex flex-col min-h-screen bg-[var(--tg-theme-secondary-bg-color)] animate-fade-in">

      {/* Шапка с иконкой */}
      <div className="bg-[var(--tg-theme-bg-color)] px-4 pt-8 pb-6 text-center">
        <div className={cn(
          'w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 transition-all',
          order.status === 'delivered'
            ? 'bg-green-100'
            : order.status === 'cancelled'
              ? 'bg-red-100'
              : 'bg-blue-100',
        )}>
          {order.status === 'delivered' ? '🎉' : order.status === 'cancelled' ? '❌' : '✅'}
        </div>
        <h1 className="text-[22px] font-bold text-[var(--tg-theme-text-color)]">
          {order.status === 'delivered'
            ? 'Заказ доставлен!'
            : order.status === 'cancelled'
              ? 'Заказ отменён'
              : isDetail
                ? `Заказ №${order.id}`
                : 'Заказ принят!'}
        </h1>
        <p className="text-sm text-[var(--tg-theme-hint-color)] mt-1">
          {isDetail
            ? formatDateTime(order.createdAt)
            : `Заказ №${order.id}`}
        </p>
        {isActive && (
          <p className="text-xs text-[var(--tg-theme-hint-color)] mt-1">
            Статус обновляется автоматически
          </p>
        )}
      </div>

      <div className="flex-1 px-4 py-4 pb-28 space-y-4">

        {/* ── Статус-стрипер ──────────────────────────── */}
        <div className="bg-[var(--tg-theme-bg-color)] rounded-2xl px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color)] mb-4">
            Статус заказа
          </p>
          <OrderStepper key={order.status} status={order.status} />
        </div>

        {/* ── Детали доставки ─────────────────────────── */}
        <div className="bg-[var(--tg-theme-bg-color)] rounded-2xl px-4 py-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color)]">
            Детали
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--tg-theme-hint-color)]">📍 Доставка</span>
              <span className="font-medium text-[var(--tg-theme-text-color)]">{order.deliveryRoom}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--tg-theme-hint-color)]">🕐 Время</span>
              <span className="font-medium text-[var(--tg-theme-text-color)]">{order.deliveryTime}</span>
            </div>
            {order.paidWith && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--tg-theme-hint-color)]">💳 Оплата</span>
                <span className="font-medium text-[var(--tg-theme-text-color)]">
                  {order.paidWith === 'card' ? 'Картой' : order.paidWith === 'talon' ? 'Талон' : 'Подписка'}
                </span>
              </div>
            )}
            {order.comment && (
              <div className="flex justify-between text-sm gap-2">
                <span className="text-[var(--tg-theme-hint-color)] flex-shrink-0">💬 Комментарий</span>
                <span className="font-medium text-[var(--tg-theme-text-color)] text-right">{order.comment}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Состав заказа ───────────────────────────── */}
        <div className="bg-[var(--tg-theme-bg-color)] rounded-2xl px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color)] mb-3">
            Состав заказа
          </p>
          {order.items.map((item) => (
            <OrderItemRow
              key={item.id}
              name={item.itemName}
              quantity={item.quantity}
              priceKopecks={item.priceKopecks}
            />
          ))}
          <div className="flex justify-between items-center pt-3 mt-1">
            <span className="text-sm font-bold text-[var(--tg-theme-text-color)]">Итого</span>
            <span className="text-lg font-bold text-emerald-600">
              {formatPrice(order.totalKopecks)}
            </span>
          </div>
        </div>

      </div>

      {/* Нативная кнопка «В меню» — sticky внизу (только в success-режиме) */}
      {!isDetail && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pt-3 bg-[var(--tg-theme-bg-color)] border-t border-[var(--tg-theme-secondary-bg-color)]"
             style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full py-4 rounded-2xl text-base font-bold bg-emerald-500 text-white active:bg-emerald-600 transition-colors"
          >
            Вернуться в меню
          </button>
        </div>
      )}
    </div>
  )
}
