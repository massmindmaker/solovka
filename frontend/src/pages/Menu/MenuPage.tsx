import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMenuItems, fetchMenu, clearMenuCache } from '@/api/menu'
import { useCartStore } from '@/store/cartStore'
import { useFavoritesStore } from '@/store/favoritesStore'
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
  isFavorite: boolean
  onAdd: () => void
  onRemove: () => void
  onToggleFavorite: () => void
  onClick: () => void
}

function MenuCard({ item, cartQty, isFavorite, onAdd, onRemove, onToggleFavorite, onClick }: MenuCardProps) {
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

  function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    haptic.impactOccurred('light')
    onToggleFavorite()
  }

  const emoji = item.isBusinessLunch ? '🍱'
    : item.categorySlug === 'soups' ? '🍲'
    : item.categorySlug === 'drinks' ? '☕'
    : item.categorySlug === 'first-courses' ? '🥗'
    : '🍽'

  return (
    <div
      onClick={onClick}
      className="relative bg-white rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.08)] active:scale-[0.97] transition-transform cursor-pointer select-none"
    >
      {/* Изображение — 3:2 по скиллу */}
      <div className="aspect-[3/2] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">{emoji}</span>
        )}
      </div>

      {/* Кнопка избранного */}
      <button
        onClick={handleFavorite}
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm active:scale-90 transition-transform"
        aria-label={isFavorite ? 'Убрать из избранного' : 'В избранное'}
      >
        <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill={isFavorite ? '#ef4444' : 'none'} stroke={isFavorite ? '#ef4444' : '#9ca3af'} strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      </button>

      {/* Контент */}
      <div className="p-3 flex flex-col gap-2.5">
        {/* Название — тёмный, контрастный текст */}
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[2.5rem]">
          {item.name}
        </p>

        {/* Описание (граммовка) */}
        {item.description && (
          <p className="text-xs font-medium text-gray-400 -mt-1">
            {item.description}
          </p>
        )}

        {/* CTA: кнопка с ценой / счётчик */}
        {cartQty === 0 ? (
          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold active:bg-emerald-600 transition-colors"
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
              className="flex items-center justify-center w-11 h-11 text-white text-lg font-bold active:bg-emerald-600 transition-colors"
              aria-label="Убрать"
            >
              −
            </button>
            <span className="text-sm font-bold text-white animate-count-pop" key={cartQty}>
              {cartQty}
            </span>
            <button
              onClick={handleAdd}
              className="flex items-center justify-center w-11 h-11 text-white text-lg font-bold active:bg-emerald-600 transition-colors"
              aria-label="Добавить ещё"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Бейдж "бизнес-ланч" */}
      {item.isBusinessLunch && (
        <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
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
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  const { addItem, removeItem, updateQuantity, items: cartItems } = useCartStore()
  const { ids: favoriteIds, toggle: toggleFavorite } = useFavoritesStore()

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
        if (prev && visibleCats.some((c) => c.slug === prev)) return prev
        return first?.slug ?? 'daily'
      })
    } catch {
      setError('Не удалось загрузить меню')
    } finally {
      setLoadingCats(false)
    }
  }, [])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  useEffect(() => {
    if (!activeSlug) return
    if (activeSlug === 'favorites') {
      if (favoriteIds.length === 0) {
        setItems([])
        setLoadingItems(false)
        return
      }
      setLoadingItems(true)
      fetchMenuItems('all')
        .then((all) => setItems(all.filter((i) => favoriteIds.includes(i.id))))
        .catch(() => setError('Не удалось загрузить блюда'))
        .finally(() => setLoadingItems(false))
      return
    }
    setLoadingItems(true)
    fetchMenuItems(activeSlug)
      .then(setItems)
      .catch(() => setError('Не удалось загрузить блюда'))
      .finally(() => setLoadingItems(false))
  }, [activeSlug, favoriteIds])

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
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Шапка ─────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white pt-4 pb-0 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="px-4 pb-3 flex items-center justify-between">
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">
            Столовая
          </h1>
          {totalCount > 0 && (
            <button
              onClick={() => navigate('/cart')}
              className="relative flex items-center gap-2 bg-emerald-500 text-white pl-4 pr-5 py-2.5 rounded-full text-sm font-bold active:bg-emerald-600 transition-colors animate-bounce-in shadow-lg shadow-emerald-500/30"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <span>{formatPrice(totalKopecks)}</span>
              {/* Бейдж количества */}
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white shadow-sm">
                {totalCount > 99 ? '99+' : totalCount}
              </span>
            </button>
          )}
        </div>

        {/* ── Категории-табы ──────────────────────────── */}
        {!loadingCats && (
          <div
            ref={tabsRef}
            className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none"
          >
            {/* Таб "Избранное" — показываем, если есть избранные */}
            {favoriteIds.length > 0 && (
              <button
                data-slug="favorites"
                onClick={() => handleTabChange('favorites')}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm transition-all whitespace-nowrap',
                  activeSlug === 'favorites'
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                    : 'bg-gray-100 text-gray-700 font-medium active:bg-gray-200',
                )}
              >
                <span>❤️</span>
                <span>Избранное</span>
              </button>
            )}
            {categories.map((cat) => (
              <button
                key={cat.slug}
                data-slug={cat.slug}
                onClick={() => handleTabChange(cat.slug)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm transition-all whitespace-nowrap',
                  activeSlug === cat.slug
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                    : 'bg-gray-100 text-gray-700 font-medium active:bg-gray-200',
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Контент ───────────────────────────────────── */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 px-4 pt-3 pb-4">
        {error ? (
          <ErrorState
            title="Ошибка"
            description={error}
            onRetry={() => loadMenu(true)}
          />
        ) : (loadingItems || !activeSlug) ? (
          <MenuSkeleton />
        ) : items.length === 0 && activeSlug === 'favorites' ? (
          <EmptyState
            icon="❤️"
            title="Нет избранного"
            description="Нажмите на сердечко, чтобы добавить блюдо в избранное"
          />
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
                isFavorite={favoriteIds.includes(item.id)}
                onAdd={() => handleAddToCart(item)}
                onRemove={() => handleRemoveFromCart(item)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                onClick={() => navigate(`/item/${item.id}`)}
              />
            ))}
          </div>
        )}
      </PullToRefresh>
    </div>
  )
}
