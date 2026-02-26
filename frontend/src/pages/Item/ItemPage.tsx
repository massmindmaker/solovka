import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchMenuItem } from '@/api/menu'
import { useCartStore } from '@/store/cartStore'
import { useBackButton } from '@/hooks/useBackButton'
import { useMainButton } from '@/hooks/useMainButton'
import { useTelegram } from '@/hooks/useTelegram'
import { formatPrice, cn } from '@/utils'
import { FullScreenSpinner } from '@/components/Spinner'
import Counter from '@/components/Counter'
import type { MenuItem } from '@/types'

const CATEGORY_EMOJI: Record<string, string> = {
  'business-lunch': '🍱',
  'first-courses': '🥗',
  'second-courses': '🍽',
  soups: '🍲',
  drinks: '☕',
  daily: '⭐',
}

export default function ItemPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { haptic } = useTelegram()

  const [item, setItem] = useState<MenuItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)

  const { addItem, updateQuantity, items: cartItems } = useCartStore()

  useBackButton()

  useEffect(() => {
    if (!id) return
    fetchMenuItem(Number(id))
      .then((data) => {
        setItem(data)
        // Если уже в корзине — показать текущее кол-во
        const inCart = cartItems.find((i) => i.id === data.id)
        if (inCart) setQuantity(inCart.quantity)
      })
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cartItem = item ? cartItems.find((i) => i.id === item.id) : undefined
  const isInCart = Boolean(cartItem)
  const total = item ? item.priceKopecks * quantity : 0

  function handleAddToCart() {
    if (!item) return
    haptic.notificationOccurred('success')
    if (isInCart) {
      updateQuantity(item.id, quantity)
    } else {
      for (let i = 0; i < quantity; i++) {
        addItem({
          id: item.id,
          name: item.name,
          priceKopecks: item.priceKopecks,
          imageUrl: item.imageUrl,
        })
      }
    }
    navigate(-1)
  }

  useMainButton({
    text: isInCart
      ? `Обновить в корзине — ${formatPrice(total)}`
      : `Добавить в корзину — ${formatPrice(total)}`,
    onClick: handleAddToCart,
  })

  if (loading) return <FullScreenSpinner />
  if (!item) return (
    <div className="flex items-center justify-center h-screen text-[var(--tg-theme-hint-color)]">
      Блюдо не найдено
    </div>
  )

  const emoji = CATEGORY_EMOJI[item.categorySlug] ?? '🍽'

  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      {/* Изображение / заглушка */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center flex-shrink-0">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[8rem] leading-none">{emoji}</span>
        )}
        {item.isBusinessLunch && (
          <div className="absolute top-4 left-4 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            Бизнес-ланч
          </div>
        )}
      </div>

      {/* Детали */}
      <div className="flex-1 bg-[var(--tg-theme-bg-color)] rounded-t-3xl -mt-4 px-5 pt-6 pb-32">
        <h1 className="text-2xl font-bold text-[var(--tg-theme-text-color)] leading-tight">
          {item.name}
        </h1>

        <div className="mt-2 flex items-center gap-3">
          <span className="text-2xl font-bold text-[var(--tg-theme-button-color)]">
            {formatPrice(item.priceKopecks)}
          </span>
          {!item.available && (
            <span className="text-sm text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
              Недоступно
            </span>
          )}
        </div>

        {item.description && (
          <p className="mt-4 text-[var(--tg-theme-text-color)] opacity-80 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Количество */}
        <div className="mt-6">
          <p className="text-sm font-medium text-[var(--tg-theme-hint-color)] mb-3 uppercase tracking-wide">
            Количество
          </p>
          <Counter
            value={quantity}
            onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
            onIncrement={() => setQuantity((q) => Math.min(10, q + 1))}
            min={1}
            max={10}
          />
        </div>

        {/* Итого */}
        {quantity > 1 && (
          <div className="mt-4 p-3 bg-[var(--tg-theme-secondary-bg-color)] rounded-xl flex justify-between items-center">
            <span className="text-sm text-[var(--tg-theme-hint-color)]">
              {quantity} × {formatPrice(item.priceKopecks)}
            </span>
            <span className="font-bold text-[var(--tg-theme-text-color)]">
              {formatPrice(total)}
            </span>
          </div>
        )}
      </div>

      {/* Нативная кнопка — резерв на случай если MainButton не показывается */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-[var(--tg-theme-bg-color)] border-t border-[var(--tg-theme-secondary-bg-color)]">
        <button
          onClick={handleAddToCart}
          disabled={!item.available}
          className={cn(
            'w-full py-3.5 rounded-2xl text-base font-semibold transition-opacity',
            item.available
              ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] active:opacity-80'
              : 'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-hint-color)] cursor-not-allowed',
          )}
        >
          {!item.available
            ? 'Недоступно'
            : isInCart
            ? `Обновить в корзине — ${formatPrice(total)}`
            : `Добавить в корзину — ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  )
}
