import { useState, useEffect, useCallback } from 'react'
import {
  fetchAdminMenu,
  updateMenuItem,
  type AdminMenuItem,
} from '../api/admin'
import { formatPrice, cn } from '@/utils'
import { useTelegram } from '@/hooks/useTelegram'
import { FullScreenSpinner } from '@/components/Spinner'
import ErrorState from '@/components/ErrorState'

export default function AdminMenuPage() {
  const { haptic } = useTelegram()
  const [items, setItems] = useState<AdminMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const loadMenu = useCallback(async () => {
    try {
      setError(false)
      const data = await fetchAdminMenu()
      setItems(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  async function toggleAvailable(item: AdminMenuItem) {
    setTogglingId(item.id)
    try {
      await updateMenuItem({ id: item.id, available: !item.available })
      haptic.impactOccurred('light')
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, available: !i.available } : i,
        ),
      )
    } catch (err) {
      haptic.notificationOccurred('error')
      alert(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setTogglingId(null)
    }
  }

  // Group by category
  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.categoryName.toLowerCase().includes(search.toLowerCase()),
  )

  const grouped = filtered.reduce<Record<string, AdminMenuItem[]>>((acc, item) => {
    const key = item.categoryName
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const totalItems = items.length
  const unavailableCount = items.filter((i) => !i.available).length

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white px-4 pt-4 pb-3">
        <h1 className="text-[28px] font-bold text-gray-900 tracking-tight mb-1">Меню</h1>
        <p className="text-sm text-gray-400 mb-3">
          {totalItems} блюд{unavailableCount > 0 && ` · ${unavailableCount} в стоп-листе`}
        </p>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию..."
          className="w-full px-4 py-2.5 rounded-xl bg-gray-100 text-base text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
        />
      </header>

      <div className="flex-1 px-4 py-3 pb-20">
        {error ? (
          <ErrorState
            title="Ошибка загрузки"
            description="Не удалось загрузить меню"
            onRetry={loadMenu}
          />
        ) : loading ? (
          <FullScreenSpinner />
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <div className="text-4xl mb-3">🍽</div>
            <p className="text-gray-500 text-sm">
              {search ? 'Ничего не найдено' : 'Меню пустое'}
            </p>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {Object.entries(grouped).map(([category, categoryItems]) => (
              <div key={category}>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
                  {category}
                </p>
                <div className="space-y-2">
                  {categoryItems.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      toggling={togglingId === item.id}
                      onToggle={() => toggleAvailable(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Menu Item Row ───────────────────────────────────────

function MenuItemRow({
  item,
  toggling,
  onToggle,
}: {
  item: AdminMenuItem
  toggling: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl px-4 py-3 flex items-center gap-3 transition-opacity',
        !item.available && 'opacity-50',
      )}
    >
      {/* Image */}
      {item.imageUrl ? (
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-xl">
          🍽
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className="text-xs text-gray-400">{formatPrice(item.priceKopecks)}</p>
      </div>

      {/* Toggle */}
      <button
        onClick={onToggle}
        disabled={toggling}
        className={cn(
          'relative w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-50',
          item.available ? 'bg-emerald-500' : 'bg-gray-300',
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform',
            item.available ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}
