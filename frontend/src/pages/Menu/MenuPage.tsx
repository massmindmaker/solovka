import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMenuItems, fetchMenu, clearMenuCache } from '@/api/menu'
import { useCartStore } from '@/store/cartStore'
import { formatPrice, cn } from '@/utils'
import { useTelegram } from '@/hooks/useTelegram'
import { MenuSkeleton } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import ErrorState from '@/components/ErrorState'
import PullToRefresh from '@/components/PullToRefresh'
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
      <div className="aspect-[4/3] bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
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
            className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold active:bg-emerald-600 transition-colors"
          >
            {formatPrice(item.priceKopecks)}
          </button>
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full flex items-center justify-between rounded-xl bg-emerald-500 overflow-hidden animate-bounce-in"
          >
            <button
              onClick={handleRemove}
              className="flex items-center justify-center w-10 py-2.5 text-white text-lg font-bold active:bg-emerald-600 transition-colors"
              aria-label="Убрать"
            >
              −
            </button>
            <span className="text-sm font-bold text-white">
              {cartQty}
            </span>
            <button
              onClick={handleAdd}
              className="flex items-center justify-center w-10 py-2.5 text-white text-lg font-bold active:bg-emerald-600 transition-colors"
              aria-label="Добавить ещё"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Бейдж "бизнес-ланч" */}
      {item.isBusinessLunch && (
        <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
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
  const [error, setError] = useState<string | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  const { addItem, removeItem, updateQuantity, items: cartItems } = useCartStore()

  // Загрузка меню (переиспользуется для первой загрузки и refresh)
  const loadMenu = useCallback(async (forceRefresh = false) => {
    try {
      setError(null)
      if (forceRefresh) clearMenuCache()
      const { categories: cats, items: allItems, dailyItemIds } = await fetchMenu()
      const dailyHasItems = dailyItemIds.length > 0

      const visibleCats = cats.filter((c) => {
        if (c.slug === 'daily') return dailyHasItems
        return allItems.some((i) => i.categorySlug === c.slug)
      })

      setCategories(visibleCats)

      const first = visibleCats[0]
      setActiveSlug((prev) => {
        // Сохраняем текущий таб при refresh, если он всё ещё существует
        if (prev && visibleCats.some((c) => c.slug === prev)) return prev
        return first?.slug ?? 'daily'
      })
    } catch {
      setError('Не удалось загрузить меню')
    } finally {
      setLoadingCats(false)
    }
  }, [])

  // Шаг 1: загружаем меню, определяем стартовую вкладку
  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  // Шаг 2: загружаем айтемы только когда activeSlug известен
  useEffect(() => {
    if (!activeSlug) return
    setLoadingItems(true)
    fetchMenuItems(activeSlug)
      .then(setItems)
      .catch(() => setError('Не удалось загрузить блюда'))
      .finally(() => setLoadingItems(false))
  }, [activeSlug])

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    haptic.impactOccurred('medium')
    await loadMenu(true)
    if (activeSlug) {
      const freshItems = await fetchMenuItems(activeSlug)
      setItems(freshItems)
    }
  }, [haptic, loadMenu, activeSlug])

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
      <header className="sticky top-0 z-30 bg-[var(--tg-theme-bg-color)] pt-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="px-4 pb-2 flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-[var(--tg-theme-text-color)]">🍽 Столовая</h1>
          {totalCount > 0 && (
            <button
              onClick={() => navigate('/cart')}
              className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-sm font-bold active:bg-emerald-600 transition-colors animate-fade-in"
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
                    ? 'bg-emerald-500 text-white'
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
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 px-4 pb-4">
        {error ? (
          <ErrorState
            title="Ошибка"
            description={error}
            onRetry={() => loadMenu(true)}
          />
        ) : (loadingItems || !activeSlug) ? (
          <MenuSkeleton />
        ) : items.length === 0 ? (
          <EmptyState
            icon="🍳"
            title="Пусто"
            description="В этой категории пока нет блюд"
          />
        ) : (
          <div key={activeSlug} className="grid grid-cols-2 gap-3 animate-fade-in">
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
      </PullToRefresh>
    </div>
  )
}
