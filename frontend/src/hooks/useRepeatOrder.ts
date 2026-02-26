import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMenuItems } from '@/api/menu'
import { useCartStore } from '@/store/cartStore'
import { useTelegram } from '@/hooks/useTelegram'
import type { Order } from '@/types'

/**
 * Хук для повторения заказа.
 * Загружает актуальные цены из меню, добавляет позиции в корзину,
 * переходит в /cart.
 */
export function useRepeatOrder() {
  const navigate = useNavigate()
  const { addItem } = useCartStore()
  const { haptic } = useTelegram()
  const [loading, setLoading] = useState(false)

  const repeatOrder = useCallback(async (order: Order) => {
    setLoading(true)
    try {
      haptic.impactOccurred('medium')

      // Загружаем все текущие позиции меню для актуальных цен
      const menuItems = await fetchMenuItems('all')
      const menuMap = new Map(menuItems.map((m) => [m.id, m]))

      let addedCount = 0

      for (const orderItem of order.items) {
        const menuItem = menuMap.get(orderItem.itemId)
        if (!menuItem || !menuItem.available) continue

        // Добавляем нужное количество раз (addItem увеличивает qty на 1)
        for (let i = 0; i < orderItem.quantity; i++) {
          addItem({
            id: menuItem.id,
            name: menuItem.name,
            priceKopecks: menuItem.priceKopecks,
            imageUrl: menuItem.imageUrl,
          })
          addedCount++
        }
      }

      if (addedCount === 0) {
        haptic.notificationOccurred('error')
        return { success: false, message: 'Ни одно блюдо из заказа не доступно' }
      }

      haptic.notificationOccurred('success')
      navigate('/cart')
      return { success: true, message: null }
    } catch {
      haptic.notificationOccurred('error')
      return { success: false, message: 'Не удалось загрузить меню' }
    } finally {
      setLoading(false)
    }
  }, [addItem, haptic, navigate])

  return { repeatOrder, loading }
}
