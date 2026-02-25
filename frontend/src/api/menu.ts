import { api } from './client'
import { MOCK_MENU_ITEMS, MOCK_CATEGORIES, MOCK_DAILY_ITEM_IDS } from '@/mock/data'
import type { MenuItem, Category } from '@/types'

const IS_DEV = import.meta.env.DEV

export async function fetchCategories(): Promise<Category[]> {
  if (IS_DEV) return Promise.resolve(MOCK_CATEGORIES)
  return api.get<Category[]>('/menu/categories')
}

export async function fetchMenuItems(categorySlug?: string): Promise<MenuItem[]> {
  if (IS_DEV) {
    const items = categorySlug === 'daily'
      ? MOCK_MENU_ITEMS.filter((i) => MOCK_DAILY_ITEM_IDS.includes(i.id))
      : categorySlug
        ? MOCK_MENU_ITEMS.filter((i) => i.categorySlug === categorySlug)
        : MOCK_MENU_ITEMS
    return Promise.resolve(items)
  }
  const qs = categorySlug ? `?category=${categorySlug}` : ''
  return api.get<MenuItem[]>(`/menu/items${qs}`)
}

export async function fetchMenuItem(id: number): Promise<MenuItem> {
  if (IS_DEV) {
    const item = MOCK_MENU_ITEMS.find((i) => i.id === id)
    if (!item) throw new Error('Блюдо не найдено')
    return Promise.resolve(item)
  }
  return api.get<MenuItem>(`/menu/items/${id}`)
}
