import { api } from '@/api/client'
import type { OrderStatus, MenuItem } from '@/types'

// ─── Types ───────────────────────────────────────────────

export interface AdminOrder {
  id: number
  status: OrderStatus
  totalKopecks: number
  deliveryAddress: string
  deliveryTime: string
  comment: string | null
  paidWith: string | null
  courierId: number | null
  createdAt: string
  updatedAt: string | null
  customerFirstName: string
  customerLastName: string | null
  customerUsername: string | null
  customerTelegramId: number
  items: {
    id: number
    orderId: number
    itemId: number
    itemName: string
    quantity: number
    priceKopecks: number
  }[]
}

export interface AdminMenuItem extends MenuItem {
  categoryName: string
  createdAt: string
}

export interface DailyMenuItem {
  id: number
  date: string
  menuItemId: number
  name: string
  description?: string | null
  priceKopecks: number
  imageUrl: string | null
  available: boolean
  categoryName: string
  categorySlug: string
}

export interface DailyMenuResponse {
  date: string
  items: DailyMenuItem[]
}

// ─── Orders ──────────────────────────────────────────────

export function fetchAdminOrders(status?: string): Promise<AdminOrder[]> {
  const qs = status ? `?status=${status}` : ''
  return api.get<AdminOrder[]>(`/admin/orders${qs}`)
}

export function updateOrderStatus(orderId: number, status: OrderStatus): Promise<{ success: boolean }> {
  return api.put<{ success: boolean }>('/admin/orders', { orderId, status })
}

// ─── Menu ────────────────────────────────────────────────

export function fetchAdminMenu(): Promise<AdminMenuItem[]> {
  return api.get<AdminMenuItem[]>('/admin/menu')
}

export function createMenuItem(data: {
  categoryId: number
  name: string
  description?: string
  priceKopecks: number
  imageUrl?: string
  isBusinessLunch?: boolean
}): Promise<AdminMenuItem> {
  return api.post<AdminMenuItem>('/admin/menu', data)
}

export function updateMenuItem(data: {
  id: number
  name?: string
  description?: string | null
  priceKopecks?: number
  imageUrl?: string | null
  available?: boolean
  isBusinessLunch?: boolean
  categoryId?: number
}): Promise<AdminMenuItem> {
  return api.put<AdminMenuItem>('/admin/menu', data)
}

export function deleteMenuItem(id: number): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/admin/menu?id=${id}`)
}

// ─── Daily Menu ──────────────────────────────────────────

export function fetchDailyMenu(date: string): Promise<DailyMenuResponse> {
  return api.get<DailyMenuResponse>(`/admin/daily-menu?date=${date}`)
}

export function setDailyMenu(date: string, itemIds: number[]): Promise<DailyMenuResponse> {
  return api.put<DailyMenuResponse>('/admin/daily-menu', { date, itemIds })
}

// ─── Stats ───────────────────────────────────────────────

export interface StatsResponse {
  period: string
  revenue: {
    total: number
    orderCount: number
    avgCheck: number
  }
  ordersByStatus: { status: string; count: number }[]
  topDishes: { itemName: string; totalQuantity: number; totalRevenue: number }[]
  paymentMethods: { method: string; count: number }[]
  courierStats: { firstName: string; lastName: string | null; deliveryCount: number }[]
  dailyRevenue: { date: string; revenue: number; orders: number }[]
}

export function fetchStats(period: 'day' | 'week' | 'month' = 'week'): Promise<StatsResponse> {
  return api.get<StatsResponse>(`/admin/stats?period=${period}`)
}
