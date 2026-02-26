import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMenuItems, fetchMenu } from '@/api/menu'
import { useCartStore } from '@/store/cartStore'
import { formatPrice, cn } from '@/utils'
import { useTelegram } from '@/hooks/useTelegram'
import Spinner from '@/components/Spinner'
import EmptyState from '@/components/EmptyState'
import type { Category, MenuItem } from '@/types'

// ─── Карточка блюда ──────────────────────────────────────

interface MenuCardProps {
  item: MenuItem
  cartQty: number
  onAdd: () => void
  onRemove: () => void
  onClick: () => void
}

function MenuCard({ item, cartQty, onAdd, onRemove, onClick }: MenuCardProps) {
  const { haptic } = useTelegram()

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    haptic.impactOccurred('light')
    onAdd()
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    haptic.selectionChanged()
    onRemove()
  }

  const emoji = item.isBusinessLunch ? '🍱'
    : item.categorySlug === 'soups' ? '🍲'
    : item.categorySlug === 'drinks' ? '☕'
    : item.categorySlug === 'first-courses' ? '🥗'
    : '🍽'

  return (
    <div
      onClick={onClick}
      className="relative bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl overflow-hidden active:scale-[0.97] transition-transform cursor-pointer select-none"
    >
      {/* Изображение */}
      <div className="aspect-square bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">{emoji}</span>
        )}
      </div>

      {/* Контент */}
      <div className="p-3 flex flex-col gap-2">
        <p className="text-sm font-medium text-[var(--tg-theme-text-color)] leading-snug line-clamp-2 min-h-[2.5rem]">
          {item.name}
        </p>

        {/* Кнопка добавления / счётчик — на всю ширину */}
        {cartQty === 0 ? (
          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-1 py-2 rounded-xl bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] text-sm font-bold active:opacity-80 transition-opacity"
          >
            {formatPrice(item.priceKopecks)}
          </button>
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full flex items-center justify-between rounded-xl bg-[var(--tg-theme-button-color)] overflow-hidden"
          >
            <button
              onClick={handleRemove}
              className="flex items-center justify-center w-10 py-2 text-[var(--tg-theme-button-text-color)] text-lg font-bold active:opacity-70 transition-opacity"
              aria-label="Убрать"
            >
              −
            </button>
            <span className="text-sm font-bold text-[var(--tg-theme-button-text-color)]">
              {cartQty}
            </span>
            <button
              onClick={handleAdd}
              className="flex items-center justify-center w-10 py-2 text-[var(--tg-theme-button-text-color)] text-lg font-bold active:opacity-70 transition-opacity"
              aria-label="Добавить ещё"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Бейдж "бизнес-ланч" */}
      {item.isBusinessLunch && (
        <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          Ланч
        </div>
      )}
    </div>
  )
}

// ─── Главная страница меню ───────────────────────────────

export default function MenuPage() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()

  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  // null = стартовая вкладка ещё не определена (ждём ответа API)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  const { addItem, removeItem, updateQuantity, items: cartItems } = useCartStore()

  // Шаг 1: загружаем меню, определяем стартовую вкладку
  useEffect(() => {
    fetchMenu().then(({ categories: cats, items: allItems, dailyItemIds }) => {
      setCategories(cats)
      const dailyHasItems = dailyItemIds.length > 0
      if (dailyHasItems) {
        setActiveSlug('daily')
      } else {
        const fallback = cats.find(
          (c) => c.slug !== 'daily' && c.slug !== 'business-lunch' && allItems.some((i) => i.categorySlug === c.slug)
        )
        setActiveSlug(fallback?.slug ?? cats[0]?.slug ?? 'daily')
      }
    }).finally(() => setLoadingCats(false))
  }, [])

  // Шаг 2: загружаем айтемы только когда activeSlug известен
  useEffect(() => {
    if (!activeSlug) return
    setLoadingItems(true)
    fetchMenuItems(activeSlug)
      .then(setItems)
      .finally(() => setLoadingItems(false))
  }, [activeSlug])

  function handleTabChange(slug: string) {
    haptic.selectionChanged()
    setActiveSlug(slug)
    // Скроллим табы к активному
    const tabEl = tabsRef.current?.querySelector(`[data-slug="${slug}"]`)
    tabEl?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  function handleAddToCart(item: MenuItem) {
    addItem({
      id: item.id,
      name: item.name,
      priceKopecks: item.priceKopecks,
      imageUrl: item.imageUrl,
    })
  }

  function handleRemoveFromCart(item: MenuItem) {
    const qty = getCartQty(item.id)
    if (qty <= 1) {
      removeItem(item.id)
    } else {
      updateQuantity(item.id, qty - 1)
    }
  }

  function getCartQty(itemId: number): number {
    return cartItems.find((i) => i.id === itemId)?.quantity ?? 0
  }

  const totalCount = cartItems.reduce((s, i) => s + i.quantity, 0)
  const totalKopecks = cartItems.reduce((s, i) => s + i.priceKopecks * i.quantity, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Шапка */}
      <header className="sticky top-0 z-30 bg-[var(--tg-theme-bg-color)] pt-3">
        <div className="px-4 pb-2 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--tg-theme-text-color)]">🍽 Столовая</h1>
          {totalCount > 0 && (
            <button
              onClick={() => navigate('/cart')}
              className="flex items-center gap-2 bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] px-3 py-1.5 rounded-full text-sm font-medium animate-fade-in"
            >
              <span>🛒</span>
              <span>{formatPrice(totalKopecks)}</span>
            </button>
          )}
        </div>

        {/* Категории-табы */}
        {!loadingCats && (
          <div
            ref={tabsRef}
            className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none"
          >
            {categories.map((cat) => (
              <button
                key={cat.slug}
                data-slug={cat.slug}
                onClick={() => handleTabChange(cat.slug)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                  activeSlug === cat.slug
                    ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
                    : 'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)]',
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Контент */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {(loadingItems || !activeSlug) ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="🍳"
            title="Пусто"
            description="В этой категории пока нет блюд"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            {items.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                cartQty={getCartQty(item.id)}
                onAdd={() => handleAddToCart(item)}
                onRemove={() => handleRemoveFromCart(item)}
                onClick={() => navigate(`/item/${item.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
