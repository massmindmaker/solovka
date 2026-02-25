import { api } from './client'
import { MOCK_ORDERS } from '@/mock/data'
import type { Order, CreateOrderPayload } from '@/types'

const IS_DEV = import.meta.env.DEV

export async function fetchOrders(): Promise<Order[]> {
  if (IS_DEV) return Promise.resolve(MOCK_ORDERS)
  return api.get<Order[]>('/orders')
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  if (IS_DEV) {
    // Мок создания заказа
    const order: Order = {
      id: Math.floor(Math.random() * 9000) + 1000,
      status: payload.paymentMethod === 'card' ? 'pending' : 'paid',
      totalKopecks: payload.items.reduce((s, _) => s + 35000, 0),
      deliveryRoom: payload.deliveryRoom,
      deliveryTime: payload.deliveryTime,
      comment: payload.comment ?? null,
      paidWith: payload.paymentMethod,
      createdAt: new Date().toISOString(),
      items: payload.items.map((it, idx) => ({
        id: idx + 1,
        itemId: it.itemId,
        itemName: 'Тестовое блюдо',
        quantity: it.quantity,
        priceKopecks: 35000,
      })),
    }
    return Promise.resolve(order)
  }
  return api.post<Order>('/orders', payload)
}

export async function initPayment(orderId: number): Promise<{ paymentUrl: string }> {
  if (IS_DEV) {
    return Promise.resolve({
      paymentUrl: 'https://securepay.tinkoff.ru/mock',
    })
  }
  return api.post<{ paymentUrl: string }>('/payment/init', { orderId })
}
