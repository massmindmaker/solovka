import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchOrders } from '@/api/orders'
import { useMainButton } from '@/hooks/useMainButton'
import { useTelegram } from '@/hooks/useTelegram'
import { formatPrice } from '@/utils'
import type { Order } from '@/types'

export default function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    haptic.notificationOccurred('success')
    // Загружаем список заказов и находим нужный
    fetchOrders().then((orders) => {
      const found = orders.find((o) => o.id === Number(id))
      if (found) setOrder(found)
    })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useMainButton({
    text: 'Вернуться в меню',
    onClick: () => navigate('/', { replace: true }),
  })

  return (
    <div className="flex flex-col items-center min-h-screen px-6 pt-16 pb-32 animate-fade-in">
      {/* Иконка успеха */}
      <div className="text-7xl mb-6">✅</div>

      <h1 className="text-2xl font-bold text-[var(--tg-theme-text-color)] text-center mb-1">
        Заказ принят!
      </h1>
      <p className="text-[var(--tg-theme-hint-color)] text-center text-sm mb-8">
        Мы уведомим вас в Telegram, когда заказ будет готов
      </p>

      {/* Карточка заказа */}
      {order && (
        <div className="w-full bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl p-4 space-y-3">
          {/* Номер заказа */}
          <div className="flex justify-between items-center pb-3 border-b border-[var(--tg-theme-bg-color)]">
            <span className="text-[var(--tg-theme-hint-color)] text-sm">Заказ</span>
            <span className="font-bold text-[var(--tg-theme-text-color)]">#{order.id}</span>
          </div>

          {/* Позиции */}
          <div className="space-y-1.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-[var(--tg-theme-text-color)] flex-1 mr-2">
                  {item.itemName}
                  {item.quantity > 1 && (
                    <span className="text-[var(--tg-theme-hint-color)]"> × {item.quantity}</span>
                  )}
                </span>
                <span className="text-[var(--tg-theme-text-color)] font-medium whitespace-nowrap">
                  {formatPrice(item.priceKopecks * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Итого */}
          <div className="pt-2 border-t border-[var(--tg-theme-bg-color)] flex justify-between font-bold">
            <span className="text-[var(--tg-theme-text-color)]">Итого</span>
            <span className="text-[var(--tg-theme-button-color)]">
              {formatPrice(order.totalKopecks)}
            </span>
          </div>

          {/* Детали доставки */}
          <div className="pt-2 border-t border-[var(--tg-theme-bg-color)] space-y-1">
            <Detail icon="📍" value={order.deliveryRoom} />
            <Detail icon="🕐" value={order.deliveryTime} />
            {order.comment && <Detail icon="💬" value={order.comment} />}
          </div>
        </div>
      )}

      {/* Заглушка пока грузится */}
      {!order && (
        <div className="w-full bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl p-4">
          <p className="text-center text-[var(--tg-theme-hint-color)] text-sm">
            Заказ #{id} создан
          </p>
        </div>
      )}
    </div>
  )
}

function Detail({ icon, value }: { icon: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--tg-theme-text-color)]">
      <span>{icon}</span>
      <span>{value}</span>
    </div>
  )
}
