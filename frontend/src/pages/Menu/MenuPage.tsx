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
  onClick: () => void
}

function MenuCard({ item, cartQty, onAdd, onClick }: MenuCardProps) {
  const { haptic } = useTelegram()

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    haptic.impactOccurred('light')
    onAdd()
  }

  return (
    <div
      onClick={onClick}
      className="relative bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl overflow-hidden active:scale-95 transition-transform cursor-pointer"
    >
      {/* Изображение */}
      <div className="aspect-square bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">
            {item.isBusinessLunch ? '🍱' : item.categorySlug === 'soups' ? '🍲'
              : item.categorySlug === 'drinks' ? '☕'
              : item.categorySlug === 'first-courses' ? '🥗' : '🍽'}
          </span>
        )}
      </div>

      {/* Контент */}
      <div className="p-3">
        <p className="text-sm font-medium text-[var(--tg-theme-text-color)] leading-snug line-clamp-2 min-h-[2.5rem]">
          {item.name}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold text-[var(--tg-theme-text-color)]">
            {formatPrice(item.priceKopecks)}
          </span>
          <button
            onClick={handleAdd}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-lg font-bold transition-colors',
              cartQty > 0
                ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
                : 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] opacity-90',
            )}
          >
            {cartQty > 0 ? cartQty : '+'}
          </button>
        </div>
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
  const [activeSlug, setActiveSlug] = useState<string>('daily')
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  const { addItem, items: cartItems } = useCartStore()

  // Загружаем все данные меню разом; если "Меню дня" пусто — переключаемся на первую непустую категорию
  useEffect(() => {
    fetchMenu().then(({ categories: cats, items: allItems, dailyItemIds }) => {
      setCategories(cats)
      // Определяем стартовую вкладку
      const dailyHasItems = dailyItemIds.length > 0
      if (!dailyHasItems) {
        // Найти первую категорию (кроме daily и business-lunch) у которой есть блюда
        const fallback = cats.find(
          (c) => c.slug !== 'daily' && c.slug !== 'business-lunch' && allItems.some((i) => i.categorySlug === c.slug)
        )
        if (fallback) setActiveSlug(fallback.slug)
      }
    }).finally(() => setLoadingCats(false))
  }, [])

  // Загружаем айтемы при смене категории
  useEffect(() => {
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
        {loadingItems ? (
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
                onClick={() => navigate(`/item/${item.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
