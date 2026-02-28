import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { OrderStatus } from '@/types'

// ─── Classnames helper ───────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ─── Форматирование цен ──────────────────────────────────

export function formatPrice(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopecks / 100)
}

// ─── Форматирование дат ──────────────────────────────────

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso))
}

// ─── Статусы заказов ─────────────────────────────────────

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачен',
  preparing: 'Готовится',
  ready: 'Готов',
  delivering: 'Доставляется',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'text-yellow-600 bg-yellow-50',
  paid: 'text-blue-600 bg-blue-50',
  preparing: 'text-orange-600 bg-orange-50',
  ready: 'text-green-600 bg-green-50',
  delivering: 'text-blue-700 bg-blue-100',
  delivered: 'text-gray-500 bg-gray-100',
  cancelled: 'text-red-500 bg-red-50',
}

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'ready',
  'delivering',
]

// ─── Склонение слов ──────────────────────────────────────

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

// plural(1, 'купон', 'купона', 'купонов') → 'купон'
// plural(3, 'купон', 'купона', 'купонов') → 'купона'
// plural(11, 'купон', 'купона', 'купонов') → 'купонов'

// ─── Время доставки ──────────────────────────────────────

export const DELIVERY_TIMES = [
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
] as const

export type DeliveryTime = (typeof DELIVERY_TIMES)[number]

// ─── Пакеты купонов ──────────────────────────────────────

import type { CouponPackage } from '@/types'

export const COUPON_PACKAGES: CouponPackage[] = [
  { quantity: 5, priceKopecks: 150000, label: '5 купонов', badge: null },
  { quantity: 10, priceKopecks: 280000, label: '10 купонов', badge: 'Выгода' },
  { quantity: 20, priceKopecks: 500000, label: '20 купонов', badge: 'Лучшая цена' },
]

// ─── Планы подписок ──────────────────────────────────────

import type { SubscriptionPlan } from '@/types'

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    type: 'lunch',
    name: 'Бизнес-ланч',
    description: 'Бесплатный ланч каждый рабочий день',
    priceKopecks: 350000,
    icon: '🍱',
  },
  {
    type: 'coffee',
    name: 'Кофе',
    description: 'Кофе каждое утро без лишних трат',
    priceKopecks: 150000,
    icon: '☕',
  },
]
