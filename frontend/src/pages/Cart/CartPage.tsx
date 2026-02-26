import { useNavigate } from 'react-router-dom'
import { useCartStore } from '@/store/cartStore'
import { useBackButton } from '@/hooks/useBackButton'
import { useMainButton } from '@/hooks/useMainButton'
import { useTelegram } from '@/hooks/useTelegram'
import { formatPrice, plural } from '@/utils'
import EmptyState from '@/components/EmptyState'
import Counter from '@/components/Counter'
import type { CartItem } from '@/types'

const MIN_ORDER_KOPECKS = 15000 // 150 ₽

// ─── Строка товара ────────────────────────────────────────

interface CartRowProps {
  item: CartItem
  onRemove: () => void
  onQuantityChange: (qty: number) => void
}

function CartRow({ item, onRemove, onQuantityChange }: CartRowProps) {
  const { haptic } = useTelegram()

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-[var(--tg-theme-secondary-bg-color)] last:border-0 animate-fade-in">
      {/* Картинка / emoji */}
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">🍽</span>
        )}
      </div>

      {/* Название + цена за 1 шт */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--tg-theme-text-color)] leading-snug line-clamp-2">
          {item.name}
        </p>
        <p className="text-xs text-[var(--tg-theme-hint-color)] mt-0.5">
          {formatPrice(item.priceKopecks)} / шт.
        </p>
        <p className="text-sm font-bold text-emerald-600 mt-1">
          {formatPrice(item.priceKopecks * item.quantity)}
        </p>
      </div>

      {/* Счётчик + удалить */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <button
          onClick={() => { haptic.impactOccurred('light'); onRemove() }}
          className="text-[var(--tg-theme-hint-color)] w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--tg-theme-secondary-bg-color)] active:bg-red-50 transition-colors text-sm"
          aria-label="Удалить"
        >
          ✕
        </button>
        <Counter
          value={item.quantity}
          onDecrement={() => { haptic.selectionChanged(); onQuantityChange(item.quantity - 1) }}
          onIncrement={() => { haptic.selectionChanged(); onQuantityChange(item.quantity + 1) }}
          min={0}
          max={20}
          size="sm"
        />
      </div>
    </div>
  )
}

// ─── Главный компонент ────────────────────────────────────

export default function CartPage() {
  const navigate = useNavigate()
  const { haptic, tg } = useTelegram()
  const { items, removeItem, updateQuantity, clearCart, totalKopecks } = useCartStore()

  useBackButton()

  const total = totalKopecks()
  const belowMin = total < MIN_ORDER_KOPECKS && items.length > 0

  useMainButton({
    text: belowMin
      ? `Минимум ${formatPrice(MIN_ORDER_KOPECKS)}`
      : `Оформить заказ — ${formatPrice(total)}`,
    onClick: () => navigate('/checkout'),
    visible: items.length > 0,
    disabled: belowMin,
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

  // ── Пустая корзина ────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-screen">
        <header className="px-4 pt-4 pb-2">
          <h1 className="text-[22px] font-bold text-[var(--tg-theme-text-color)]">Корзина</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon="🛒"
            title="Корзина пуста"
            description="Добавьте блюда из меню"
            action={
              <button
                onClick={() => navigate('/')}
                className="mt-2 px-5 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-bold active:bg-emerald-600 transition-colors"
              >
                Перейти в меню
              </button>
            }
          />
        </div>
      </div>
    )
  }

  // ── Заполненная корзина ───────────────────────────────

  const uniqueCount = items.length
  const positionLabel = plural(uniqueCount, 'позиция', 'позиции', 'позиций')

  return (
    <div className="flex flex-col min-h-screen">

      {/* Шапка */}
      <header className="sticky top-0 z-10 bg-[var(--tg-theme-bg-color)] px-4 pt-4 pb-3 border-b border-[var(--tg-theme-secondary-bg-color)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] text-lg active:opacity-70 transition-opacity"
              aria-label="Назад"
            >
              ←
            </button>
            <div>
              <h1 className="text-[22px] font-bold text-[var(--tg-theme-text-color)]">Корзина</h1>
              <p className="text-xs text-[var(--tg-theme-hint-color)] mt-0.5">
                {uniqueCount} {positionLabel}
              </p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="text-sm text-red-500 font-medium px-3 py-1.5 rounded-lg active:bg-red-50 transition-colors"
          >
            Очистить
          </button>
        </div>
      </header>

      {/* Список позиций */}
      <div className="flex-1 px-4 pb-4">
        {items.map((item) => (
          <CartRow
            key={item.id}
            item={item}
            onRemove={() => removeItem(item.id)}
            onQuantityChange={(qty) => updateQuantity(item.id, qty)}
          />
        ))}
      </div>

      {/* Итоговый блок */}
      <div className="sticky bottom-16 bg-[var(--tg-theme-bg-color)] border-t border-[var(--tg-theme-secondary-bg-color)] px-4 pt-4 pb-5 space-y-2">

        {/* Разбивка позиций */}
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-[var(--tg-theme-hint-color)] truncate mr-2 flex-1">
                {item.name}
                {item.quantity > 1 && (
                  <span className="font-medium"> × {item.quantity}</span>
                )}
              </span>
              <span className="text-[var(--tg-theme-text-color)] font-medium whitespace-nowrap">
                {formatPrice(item.priceKopecks * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Разделитель */}
        <div className="border-t border-dashed border-[var(--tg-theme-secondary-bg-color)] pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-base font-bold text-[var(--tg-theme-text-color)]">Итого</span>
            <span className="text-xl font-bold text-emerald-600">
              {formatPrice(total)}
            </span>
          </div>
        </div>

        {/* Предупреждение о минимальной сумме */}
        {belowMin && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 animate-fade-in">
            <span className="text-amber-500 text-sm">⚠️</span>
            <p className="text-xs text-amber-700 font-medium">
              Минимальная сумма заказа — {formatPrice(MIN_ORDER_KOPECKS)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
