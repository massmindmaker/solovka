import { useState } from 'react'
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

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { haptic, tg } = useTelegram()
  const { items, totalKopecks, clearCart } = useCartStore()
  const { getTalonBalance, hasActiveSubscription } = useUserStore()
  const [deliveryRoom, setDeliveryRoom] = useState('')
  const [deliveryTime, setDeliveryTime] = useState<DeliveryTime>('12:00')
  const [comment, setComment] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [submitting, setSubmitting] = useState(false)

  const lunchBalance = getTalonBalance('lunch')
  const hasLunchSub = hasActiveSubscription('lunch')
  const total = totalKopecks()

  useBackButton()

  // Валидация
  const canProceed = deliveryRoom.trim().length > 0

  async function handleSubmit() {
    if (!canProceed || submitting) return

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
        // Открываем форму оплаты T-Bank
        tg.showPopup(
          {
            title: 'Оплата',
            message: `Заказ #${order.id} создан. Перейти к оплате ${formatPrice(total)}?`,
            buttons: [
              { id: 'pay', type: 'default', text: 'Оплатить' },
              { id: 'later', type: 'cancel' },
            ],
          },
          (btnId) => {
            if (btnId === 'pay') {
              // В реальном приложении: openLink(paymentUrl) через @tma.js/sdk
              window.open(paymentUrl, '_blank')
            }
            clearCart()
            navigate(`/order-success/${order.id}`, { replace: true })
          },
        )
      } else {
        // Талон или подписка — сразу успех
        haptic.notificationOccurred('success')
        clearCart()
        navigate(`/order-success/${order.id}`, { replace: true })
      }
    } catch (err) {
      haptic.notificationOccurred('error')
      tg.showPopup({
        message: err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте ещё раз.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  useMainButton({
    text: submitting ? 'Оформляем...' : `Оплатить — ${formatPrice(total)}`,
    onClick: handleSubmit,
    disabled: !canProceed,
    loading: submitting,
  })

  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      <header className="sticky top-0 z-10 bg-[var(--tg-theme-bg-color)] px-4 pt-4 pb-3 border-b border-[var(--tg-theme-secondary-bg-color)]">
        <h1 className="text-xl font-bold text-[var(--tg-theme-text-color)]">Оформление заказа</h1>
      </header>

      <div className="flex-1 px-4 py-4 pb-32 space-y-5 overflow-y-auto">

        {/* ── Куда доставить ── */}
        <Section title="📍 Куда доставить">
          <input
            type="text"
            value={deliveryRoom}
            onChange={(e) => setDeliveryRoom(e.target.value)}
            placeholder="Кабинет, этаж или комната"
            maxLength={80}
            className="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] placeholder:text-[var(--tg-theme-hint-color)] outline-none text-sm"
          />
        </Section>

        {/* ── Время доставки ── */}
        <Section title="🕐 Время доставки">
          <div className="flex flex-wrap gap-2">
            {DELIVERY_TIMES.map((time) => (
              <button
                key={time}
                onClick={() => { haptic.selectionChanged(); setDeliveryTime(time) }}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  deliveryTime === time
                    ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
                    : 'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)]',
                )}
              >
                {time}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Комментарий ── */}
        <Section title="💬 Комментарий">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Без лука, аллергия на орехи..."
            rows={2}
            maxLength={200}
            className="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] placeholder:text-[var(--tg-theme-hint-color)] outline-none text-sm resize-none"
          />
        </Section>

        {/* ── Способ оплаты ── */}
        <Section title="💳 Способ оплаты">
          <div className="space-y-2">
            <PaymentOption
              id="card"
              icon="💳"
              label="Банковской картой"
              sublabel="Через T-Bank"
              selected={paymentMethod === 'card'}
              onSelect={() => { haptic.selectionChanged(); setPaymentMethod('card') }}
            />
            <PaymentOption
              id="talon"
              icon="🎫"
              label="Талоном на ланч"
              sublabel={lunchBalance > 0 ? `Остаток: ${lunchBalance} шт.` : 'Нет талонов'}
              selected={paymentMethod === 'talon'}
              onSelect={() => { haptic.selectionChanged(); setPaymentMethod('talon') }}
              disabled={lunchBalance === 0}
            />
            <PaymentOption
              id="subscription"
              icon="✅"
              label="Подписка"
              sublabel={hasLunchSub ? 'Бизнес-ланч активна' : 'Нет активной подписки'}
              selected={paymentMethod === 'subscription'}
              onSelect={() => { haptic.selectionChanged(); setPaymentMethod('subscription') }}
              disabled={!hasLunchSub}
            />
          </div>
        </Section>

        {/* ── Состав заказа ── */}
        <Section title="🧾 Ваш заказ">
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="text-[var(--tg-theme-text-color)] flex-1 mr-2">
                  {item.name}
                  {item.quantity > 1 && (
                    <span className="text-[var(--tg-theme-hint-color)]"> × {item.quantity}</span>
                  )}
                </span>
                <span className="text-[var(--tg-theme-text-color)] font-medium whitespace-nowrap">
                  {formatPrice(item.priceKopecks * item.quantity)}
                </span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-[var(--tg-theme-secondary-bg-color)] flex justify-between font-bold">
              <span className="text-[var(--tg-theme-text-color)]">Итого</span>
              <span className="text-[var(--tg-theme-button-color)]">{formatPrice(total)}</span>
            </div>
          </div>
        </Section>

      </div>
    </div>
  )
}

// ─── Вспомогательные компоненты ──────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-[var(--tg-theme-text-color)] mb-2">{title}</p>
      {children}
    </div>
  )
}

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
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
        selected
          ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
          : 'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)]',
        disabled && 'opacity-40',
      )}
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{label}</p>
        <p className={cn(
          'text-xs leading-snug mt-0.5',
          selected ? 'opacity-75' : 'text-[var(--tg-theme-hint-color)]',
        )}>
          {sublabel}
        </p>
      </div>
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
        selected ? 'border-[var(--tg-theme-button-text-color)]' : 'border-[var(--tg-theme-hint-color)]',
      )}>
        {selected && (
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--tg-theme-button-text-color)]" />
        )}
      </div>
    </button>
  )
}
