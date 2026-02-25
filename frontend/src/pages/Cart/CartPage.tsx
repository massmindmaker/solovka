import { useNavigate } from 'react-router-dom'
import { useCartStore } from '@/store/cartStore'
import { useBackButton } from '@/hooks/useBackButton'
import { useMainButton } from '@/hooks/useMainButton'
import { useTelegram } from '@/hooks/useTelegram'
import { formatPrice } from '@/utils'
import EmptyState from '@/components/EmptyState'
import Counter from '@/components/Counter'
import type { CartItem } from '@/types'

interface CartRowProps {
  item: CartItem
  onRemove: () => void
  onQuantityChange: (qty: number) => void
}

function CartRow({ item, onRemove, onQuantityChange }: CartRowProps) {
  const { haptic } = useTelegram()
  const emoji = '🍽'

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--tg-theme-secondary-bg-color)] last:border-0">
      {/* Иконка */}
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center flex-shrink-0">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl" />
        ) : (
          <span className="text-2xl">{emoji}</span>
        )}
      </div>

      {/* Название + цена */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--tg-theme-text-color)] leading-snug line-clamp-2">
          {item.name}
        </p>
        <p className="text-sm text-[var(--tg-theme-button-color)] font-semibold mt-0.5">
          {formatPrice(item.priceKopecks * item.quantity)}
        </p>
      </div>

      {/* Счётчик + удалить */}
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={() => { haptic.impactOccurred('light'); onRemove() }}
          className="text-[var(--tg-theme-hint-color)] text-lg leading-none p-1"
        >
          ✕
        </button>
        <Counter
          value={item.quantity}
          onDecrement={() => {
            haptic.selectionChanged()
            onQuantityChange(item.quantity - 1)
          }}
          onIncrement={() => {
            haptic.selectionChanged()
            onQuantityChange(item.quantity + 1)
          }}
          min={0}
          max={10}
          size="sm"
        />
      </div>
    </div>
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const { haptic, tg } = useTelegram()
  const { items, removeItem, updateQuantity, clearCart, totalKopecks, totalCount } = useCartStore()

  useBackButton()

  useMainButton({
    text: `Оформить заказ — ${formatPrice(totalKopecks())}`,
    onClick: () => navigate('/checkout'),
    visible: items.length > 0,
  })

  function handleClear() {
    tg.showPopup(
      {
        title: 'Очистить корзину',
        message: 'Удалить все позиции из корзины?',
        buttons: [
          { id: 'confirm', type: 'destructive', text: 'Очистить' },
          { id: 'cancel', type: 'cancel' },
        ],
      },
      (id) => {
        if (id === 'confirm') {
          haptic.notificationOccurred('warning')
          clearCart()
        }
      },
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <header className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold text-[var(--tg-theme-text-color)]">Корзина</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon="🛒"
            title="Корзина пуста"
            description="Добавьте блюда из меню"
            action={
              <button
                onClick={() => navigate('/')}
                className="mt-2 text-[var(--tg-theme-button-color)] font-medium"
              >
                Перейти в меню →
              </button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 bg-[var(--tg-theme-bg-color)] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--tg-theme-text-color)]">Корзина</h1>
          <button
            onClick={handleClear}
            className="text-sm text-red-500 font-medium"
          >
            Очистить
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 animate-fade-in">
        {items.map((item) => (
          <CartRow
            key={item.id}
            item={item}
            onRemove={() => removeItem(item.id)}
            onQuantityChange={(qty) => updateQuantity(item.id, qty)}
          />
        ))}
      </div>

      {/* Итог */}
      <div className="px-4 pt-3 pb-6 border-t border-[var(--tg-theme-secondary-bg-color)] bg-[var(--tg-theme-bg-color)]">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[var(--tg-theme-hint-color)]">
            {totalCount()} {totalCount() === 1 ? 'позиция' : totalCount() < 5 ? 'позиции' : 'позиций'}
          </span>
          <span className="text-xl font-bold text-[var(--tg-theme-text-color)]">
            {formatPrice(totalKopecks())}
          </span>
        </div>
      </div>
    </div>
  )
}
