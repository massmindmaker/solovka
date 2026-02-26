import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '@/store/cartStore'
import { useUserStore } from '@/store/userStore'
import { useBackButton } from '@/hooks/useBackButton'
import { useMainButton } from '@/hooks/useMainButton'
import { useTelegram } from '@/hooks/useTelegram'
import { createOrder, initPayment } from '@/api/orders'
import { formatPrice, DELIVERY_TIMES, cn } from '@/utils'
import type { DeliveryTime } from '@/utils'
import type { CreateOrderPayload, PaymentMethod } from '@/types'

const SAVED_ROOM_KEY = 'solovka_last_room'

// Список популярных мест доставки — настройте под реальные кабинеты
const ROOM_SUGGESTIONS = [
  'Кабинет 101',
  'Кабинет 102',
  'Кабинет 201',
  'Кабинет 202',
  'Кабинет 301',
  'Кабинет 302',
  'Кабинет 303',
  'Кабинет 304',
  'Кабинет 305',
  'Переговорная А',
  'Переговорная Б',
  'Опенспейс 1 этаж',
  'Опенспейс 2 этаж',
  'Ресепшн',
]

// ─── Секция формы ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color)] mb-2 px-1">
        {title}
      </p>
      {children}
    </div>
  )
}

// ─── Вариант оплаты ───────────────────────────────────────

interface PaymentOptionProps {
  id: PaymentMethod
  icon: string
  label: string
  sublabel: string
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}

function PaymentOption({ icon, label, sublabel, selected, onSelect, disabled }: PaymentOptionProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all',
        selected
          ? 'bg-emerald-500 text-white shadow-sm'
          : 'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)]',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{label}</p>
        <p className={cn('text-xs leading-snug mt-0.5', selected ? 'opacity-75' : 'text-[var(--tg-theme-hint-color)]')}>
          {sublabel}
        </p>
      </div>
      {/* Radio circle */}
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
        selected ? 'border-white' : 'border-[var(--tg-theme-hint-color)]',
      )}>
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
      </div>
    </button>
  )
}

// ─── Главный компонент ────────────────────────────────────

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { haptic, tg } = useTelegram()
  const { items, totalKopecks, clearCart } = useCartStore()
  const { getTalonBalance, hasActiveSubscription } = useUserStore()

  // Восстанавливаем последний кабинет
  const [deliveryRoom, setDeliveryRoom] = useState(
    () => localStorage.getItem(SAVED_ROOM_KEY) ?? ''
  )
  const [roomError, setRoomError] = useState('')
  const [roomSuggestionsOpen, setRoomSuggestionsOpen] = useState(false)
  const [deliveryTime, setDeliveryTime] = useState<DeliveryTime>('12:00')
  const [comment, setComment] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [submitting, setSubmitting] = useState(false)
  const roomInputRef = useRef<HTMLInputElement>(null)
  const roomWrapRef = useRef<HTMLDivElement>(null)

  const lunchBalance = getTalonBalance('lunch')
  const hasLunchSub = hasActiveSubscription('lunch')
  const total = totalKopecks()

  useBackButton()

  // Если корзина пуста — вернуть назад
  useEffect(() => {
    if (items.length === 0) navigate('/', { replace: true })
  }, [items.length, navigate])

  // Сохраняем кабинет при изменении
  function handleRoomChange(val: string) {
    setDeliveryRoom(val)
    setRoomError('')
    setRoomSuggestionsOpen(val.length > 0)
    localStorage.setItem(SAVED_ROOM_KEY, val)
  }

  function handleRoomSelect(val: string) {
    setDeliveryRoom(val)
    setRoomError('')
    setRoomSuggestionsOpen(false)
    localStorage.setItem(SAVED_ROOM_KEY, val)
    haptic.selectionChanged()
  }

  // Закрываем список при клике вне
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (roomWrapRef.current && !roomWrapRef.current.contains(e.target as Node)) {
      setRoomSuggestionsOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [handleOutsideClick])

  // Фильтруем подсказки по введённому тексту
  const filteredSuggestions = deliveryRoom.trim().length === 0
    ? ROOM_SUGGESTIONS
    : ROOM_SUGGESTIONS.filter((s) =>
        s.toLowerCase().includes(deliveryRoom.toLowerCase())
      )

  // Валидация
  function validate(): boolean {
    if (deliveryRoom.trim().length < 2) {
      setRoomError('Укажите куда доставить (минимум 2 символа)')
      roomInputRef.current?.focus()
      haptic.notificationOccurred('error')
      return false
    }
    return true
  }

  async function handleSubmit() {
    if (submitting) return
    if (!validate()) return

    setSubmitting(true)
    haptic.impactOccurred('medium')

    try {
      const payload: CreateOrderPayload = {
        items: items.map((i) => ({ itemId: i.id, quantity: i.quantity })),
        deliveryRoom: deliveryRoom.trim(),
        deliveryTime,
        comment: comment.trim() || undefined,
        paymentMethod,
      }

      const order = await createOrder(payload)

      if (paymentMethod === 'card') {
        const { paymentUrl } = await initPayment(order.id)
        // Открываем T-Bank форму оплаты
        window.open(paymentUrl, '_blank')
        clearCart()
        navigate(`/order-success/${order.id}`, {
          replace: true,
          state: { order },
        })
      } else {
        haptic.notificationOccurred('success')
        clearCart()
        navigate(`/order-success/${order.id}`, {
          replace: true,
          state: { order },
        })
      }
    } catch (err) {
      haptic.notificationOccurred('error')
      tg.showPopup({
        title: 'Ошибка',
        message: err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте ещё раз.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  useMainButton({
    text: submitting ? 'Оформляем...' : `Оплатить — ${formatPrice(total)}`,
    onClick: handleSubmit,
    disabled: submitting,
    loading: submitting,
  })

  return (
    <div className="flex flex-col min-h-screen animate-fade-in bg-[var(--tg-theme-secondary-bg-color)]">

      {/* Шапка с кнопкой Назад */}
      <header className="sticky top-0 z-10 bg-[var(--tg-theme-bg-color)] px-4 pt-4 pb-3 border-b border-[var(--tg-theme-secondary-bg-color)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] text-lg active:opacity-70 transition-opacity"
            aria-label="Назад"
          >
            ←
          </button>
          <h1 className="text-[22px] font-bold text-gray-900">Оформление заказа</h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-28 space-y-4">

        {/* ── 1. СВОДКА ЗАКАЗА (ПЕРВОЙ!) ────────────────── */}
        <div className="bg-[var(--tg-theme-bg-color)] rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-[var(--tg-theme-secondary-bg-color)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color)]">
              Ваш заказ
            </p>
          </div>
          <div className="px-4 py-3 space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-start gap-2">
                <span className="text-sm text-[var(--tg-theme-text-color)] flex-1 leading-snug">
                  {item.name}
                  {item.quantity > 1 && (
                    <span className="text-[var(--tg-theme-hint-color)] font-medium"> × {item.quantity}</span>
                  )}
                </span>
                <span className="text-sm font-semibold text-[var(--tg-theme-text-color)] whitespace-nowrap">
                  {formatPrice(item.priceKopecks * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-[var(--tg-theme-secondary-bg-color)] flex justify-between items-center">
            <span className="text-sm font-bold text-[var(--tg-theme-text-color)]">Итого</span>
            <span className="text-lg font-bold text-emerald-600">{formatPrice(total)}</span>
          </div>
        </div>

        {/* ── 2. КУДА ДОСТАВИТЬ ─────────────────────────── */}
        <div className="bg-[var(--tg-theme-bg-color)] rounded-2xl px-4 py-4 space-y-3">
          <Section title="📍 Куда доставить">
            <div ref={roomWrapRef} className="relative">
              <input
                ref={roomInputRef}
                type="text"
                value={deliveryRoom}
                onChange={(e) => handleRoomChange(e.target.value)}
                onFocus={() => setRoomSuggestionsOpen(true)}
                placeholder="Кабинет, этаж или место"
                maxLength={80}
                autoComplete="off"
                className={cn(
                  'w-full px-4 py-3 rounded-xl text-base outline-none transition-all',
                  'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)]',
                  'placeholder:text-[var(--tg-theme-hint-color)]',
                  roomError ? 'ring-2 ring-red-400' : 'focus:ring-2 focus:ring-emerald-500',
                )}
              />

              {/* Выпадающий список подсказок */}
              {roomSuggestionsOpen && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-[var(--tg-theme-bg-color)] rounded-xl shadow-lg border border-[var(--tg-theme-secondary-bg-color)] overflow-hidden animate-slide-up max-h-48 overflow-y-auto">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      onMouseDown={(e) => { e.preventDefault(); handleRoomSelect(s) }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm transition-colors',
                        s === deliveryRoom
                          ? 'bg-emerald-500 text-white'
                          : 'text-[var(--tg-theme-text-color)] hover:bg-[var(--tg-theme-secondary-bg-color)] active:bg-[var(--tg-theme-secondary-bg-color)]',
                      )}
                    >
                      📍 {s}
                    </button>
                  ))}
                </div>
              )}

              {roomError && (
                <p className="text-xs text-red-500 mt-1.5 px-1 animate-fade-in">{roomError}</p>
              )}
              {deliveryRoom && !roomError && (
                <p className="text-xs text-[var(--tg-theme-hint-color)] mt-1.5 px-1">
                  💾 Сохранено — подставится при следующем заказе
                </p>
              )}
            </div>
          </Section>
        </div>

        {/* ── 3. ВРЕМЯ ДОСТАВКИ ─────────────────────────── */}
        <div className="bg-[var(--tg-theme-bg-color)] rounded-2xl px-4 py-4">
          <Section title="🕐 Время доставки">
            <div className="flex flex-wrap gap-2">
              {DELIVERY_TIMES.map((time) => (
                <button
                  key={time}
                  onClick={() => { haptic.selectionChanged(); setDeliveryTime(time) }}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                    deliveryTime === time
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)]',
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </Section>
        </div>

        {/* ── 4. СПОСОБ ОПЛАТЫ ──────────────────────────── */}
        <div className="bg-[var(--tg-theme-bg-color)] rounded-2xl px-4 py-4">
          <Section title="💳 Способ оплаты">
            <div className="space-y-2">
              <PaymentOption
                id="card"
                icon="💳"
                label="Банковской картой"
                sublabel="Перейдёте на страницу T-Bank"
                selected={paymentMethod === 'card'}
                onSelect={() => { haptic.selectionChanged(); setPaymentMethod('card') }}
              />
              <PaymentOption
                id="talon"
                icon="🎫"
                label="Талоном на ланч"
                sublabel={lunchBalance > 0 ? `Баланс: ${lunchBalance} шт.` : 'Нет талонов — купите в Профиле'}
                selected={paymentMethod === 'talon'}
                onSelect={() => { haptic.selectionChanged(); setPaymentMethod('talon') }}
                disabled={lunchBalance === 0}
              />
              <PaymentOption
                id="subscription"
                icon="✅"
                label="По подписке"
                sublabel={hasLunchSub ? 'Подписка «Бизнес-ланч» активна' : 'Нет активной подписки'}
                selected={paymentMethod === 'subscription'}
                onSelect={() => { haptic.selectionChanged(); setPaymentMethod('subscription') }}
                disabled={!hasLunchSub}
              />
            </div>
          </Section>
        </div>

        {/* ── 5. КОММЕНТАРИЙ ────────────────────────────── */}
        <div className="bg-[var(--tg-theme-bg-color)] rounded-2xl px-4 py-4">
          <Section title="💬 Комментарий (необязательно)">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Без лука, аллергия на орехи..."
              rows={2}
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] placeholder:text-[var(--tg-theme-hint-color)] outline-none text-base resize-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            {comment.length > 150 && (
              <p className="text-xs text-[var(--tg-theme-hint-color)] mt-1 text-right">
                {comment.length}/200
              </p>
            )}
          </Section>
        </div>

      </div>

      {/* Нативная кнопка «Оплатить» — sticky внизу */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pt-3 bg-[var(--tg-theme-bg-color)] border-t border-[var(--tg-theme-secondary-bg-color)]"
           style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={cn(
            'w-full py-4 rounded-2xl text-base font-bold transition-all',
            submitting
              ? 'bg-gray-300 text-gray-500 cursor-wait'
              : 'bg-emerald-500 text-white active:bg-emerald-600',
          )}
        >
          {submitting ? 'Оформляем...' : `Оплатить — ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  )
}
