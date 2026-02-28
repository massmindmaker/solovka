import { api } from '@/api/client'
import type { OrderStatus } from '@/types'

// ─── Types ───────────────────────────────────────────────

export interface DeliveryOrder {
  id: number
  status: OrderStatus
  totalKopecks: number
  deliveryAddress: string
  deliveryTime: string
  comment: string | null
  paidWith: string | null
  createdAt: string
  updatedAt?: string | null
  customerFirstName: string
  customerLastName: string | null
  customerUsername?: string | null
  items: {
    id?: number
    orderId: number
    itemName: string
    quantity: number
    priceKopecks?: number
  }[]
}

export interface DeliveryHistoryResponse {
  orders: DeliveryOrder[]
  stats: {
    delivered: number
    inProgress: number
    total: number
  }
}

// ─── API ─────────────────────────────────────────────────

/** Get orders ready for pickup */
export function fetchReadyOrders(): Promise<DeliveryOrder[]> {
  return api.get<DeliveryOrder[]>('/delivery/orders')
}

/** Pick up an order (ready → delivering) */
export function pickupOrder(orderId: number): Promise<{ success: boolean }> {
  return api.put<{ success: boolean }>('/delivery/pickup', { orderId })
}

/** Complete delivery (delivering → delivered) */
export function completeDelivery(orderId: number): Promise<{ success: boolean }> {
  return api.put<{ success: boolean }>('/delivery/complete', { orderId })
}

/** Get today's delivery history for this courier */
export function fetchDeliveryHistory(): Promise<DeliveryHistoryResponse> {
  return api.get<DeliveryHistoryResponse>('/delivery/history')
}
