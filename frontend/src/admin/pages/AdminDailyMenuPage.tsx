import { useState, useEffect, useCallback } from 'react'
import {
  fetchAdminMenu,
  fetchDailyMenu,
  setDailyMenu,
  type AdminMenuItem,
  type DailyMenuItem,
} from '../api/admin'
import { formatPrice, cn } from '@/utils'
import { useTelegram } from '@/hooks/useTelegram'
import { FullScreenSpinner } from '@/components/Spinner'
import ErrorState from '@/components/ErrorState'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDateRu(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function AdminDailyMenuPage() {
  const { haptic } = useTelegram()
  const [date, setDate] = useState(todayStr)
  const [allItems, setAllItems] = useState<AdminMenuItem[]>([])
  const [dailyItems, setDailyItems] = useState<DailyMenuItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const [dirty, setDirty] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setError(false)
      const [menu, daily] = await Promise.all([
        fetchAdminMenu(),
        fetchDailyMenu(date),
      ])
      setAllItems(menu.filter((m) => m.available))
      setDailyItems(daily.items)
      setSelectedIds(new Set(daily.items.map((i) => i.menuItemId)))
      setDirty(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    setLoading(true)
    loadData()
  }, [loadData])

  function toggleItem(id: number) {
    haptic.selectionChanged()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const result = await setDailyMenu(date, [...selectedIds])
      setDailyItems(result.items)
      setDirty(false)
      haptic.notificationOccurred('success')
    } catch (err) {
      haptic.notificationOccurred('error')
      alert(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  // Group available items by category
  const grouped = allItems.reduce<Record<string, AdminMenuItem[]>>((acc, item) => {
    const key = item.categoryName
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white px-4 pt-4 pb-3">
        <h1 className="text-[28px] font-bold text-gray-900 tracking-tight mb-3">Меню дня</h1>

        {/* Date navigation */}
        <div className="flex items-center justify-between bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setDate((d) => addDays(d, -1))}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 active:bg-white transition-colors"
          >
            ←
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900">{formatDateRu(date)}</p>
            <p className="text-xs text-gray-400">
              {selectedIds.size} блюд выбрано
            </p>
          </div>
          <button
            onClick={() => setDate((d) => addDays(d, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 active:bg-white transition-colors"
          >
            →
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 py-3 pb-28">
        {error ? (
          <ErrorState
            title="Ошибка загрузки"
            description="Не удалось загрузить данные"
            onRetry={loadData}
          />
        ) : loading ? (
          <FullScreenSpinner />
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <div className="text-4xl mb-3">🍽</div>
            <p className="text-gray-500 text-sm">Нет доступных блюд</p>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {Object.entries(grouped).map(([category, categoryItems]) => (
              <div key={category}>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
                  {category}
                </p>
                <div className="space-y-1.5">
                  {categoryItems.map((item) => {
                    const selected = selectedIds.has(item.id)
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all',
                          selected
                            ? 'bg-emerald-50 ring-2 ring-emerald-500'
                            : 'bg-white',
                        )}
                      >
                        {/* Checkbox */}
                        <div
                          className={cn(
                            'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                            selected
                              ? 'bg-emerald-500 text-white'
                              : 'border-2 border-gray-300',
                          )}
                        >
                          {selected && (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Image */}
                        {item.imageUrl ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">
                            🍽
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">{formatPrice(item.priceKopecks)}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky save button */}
      {dirty && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 px-4 pt-3 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4rem))' }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'w-full py-4 rounded-2xl text-base font-bold transition-all',
              saving
                ? 'bg-gray-300 text-gray-500 cursor-wait'
                : 'bg-emerald-500 text-white active:bg-emerald-600 shadow-lg shadow-emerald-500/25',
            )}
          >
            {saving
              ? 'Сохраняем...'
              : `Сохранить меню дня (${selectedIds.size} блюд)`}
          </button>
        </div>
      )}
    </div>
  )
}
