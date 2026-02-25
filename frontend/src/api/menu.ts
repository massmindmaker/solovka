import { api } from './client'
import { MOCK_MENU_ITEMS, MOCK_CATEGORIES, MOCK_DAILY_ITEM_IDS } from '@/mock/data'
import type { MenuItem, Category } from '@/types'

const IS_DEV = import.meta.env.DEV

interface MenuResponse {
  categories: Category[]
  items: MenuItem[]
  dailyItemIds: number[]
}

// Module-level cache — populated on first fetchMenu() call
let menuCache: MenuResponse | null = null

export async function fetchMenu(): Promise<MenuResponse> {
  if (IS_DEV) {
    return Promise.resolve({
      categories: MOCK_CATEGORIES,
      items: MOCK_MENU_ITEMS,
      dailyItemIds: MOCK_DAILY_ITEM_IDS,
    })
  }
  if (menuCache) return menuCache
  const data = await api.get<MenuResponse>('/menu')
  menuCache = data
  return data
}

export function clearMenuCache() {
  menuCache = null
}

export async function fetchCategories(): Promise<Category[]> {
  const { categories } = await fetchMenu()
  return categories
}

export async function fetchMenuItems(categorySlug?: string): Promise<MenuItem[]> {
  const { items, dailyItemIds } = await fetchMenu()
  if (!categorySlug || categorySlug === 'all') return items
  if (categorySlug === 'daily') return items.filter((i) => dailyItemIds.includes(i.id))
  return items.filter((i) => i.categorySlug === categorySlug)
}

export async function fetchMenuItem(id: number): Promise<MenuItem> {
  const { items } = await fetchMenu()
  const item = items.find((i) => i.id === id)
  if (!item) throw new Error('Блюдо не найдено')
  return item
}
