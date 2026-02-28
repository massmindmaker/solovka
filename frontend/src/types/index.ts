// ─── Каталог ─────────────────────────────────────────────

export interface Category {
  id: number
  name: string
  slug: string
  icon: string
  sortOrder: number
}

export interface MenuItem {
  id: number
  categoryId: number
  categorySlug: string
  name: string
  description: string | null
  priceKopecks: number
  imageUrl: string | null
  available: boolean
  isBusinessLunch: boolean
}

export interface DailyMenuItem {
  id: number
  date: string
  item: MenuItem
}

// ─── Пользователь ────────────────────────────────────────

export interface TelegramUser {
  id: number
  firstName: string
  lastName: string | null
  username: string | null
  languageCode: string | null
  isPremium: boolean
}

export type UserRole = 'customer' | 'admin' | 'delivery'

export interface AppUser {
  id: number
  telegramId: number
  firstName: string
  lastName: string | null
  username: string | null
  notifyDailyMenu: boolean
  role: UserRole
  createdAt: string
}

// ─── Корзина ─────────────────────────────────────────────

export interface CartItem {
  id: number
  name: string
  priceKopecks: number
  imageUrl: string | null
  quantity: number
}

// ─── Заказы ──────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled'

export type PaymentMethod = 'card' | 'coupon' | 'subscription'

export interface OrderItem {
  id: number
  itemId: number
  itemName: string
  quantity: number
  priceKopecks: number
}

export interface Order {
  id: number
  status: OrderStatus
  totalKopecks: number
  deliveryAddress: string
  deliveryTime: string
  comment: string | null
  paidWith: PaymentMethod | null
  items: OrderItem[]
  createdAt: string
}

export interface CreateOrderPayload {
  items: { itemId: number; quantity: number }[]
  deliveryAddress: string
  deliveryTime: string
  comment?: string
  paymentMethod: PaymentMethod
}

// ─── Подписки ────────────────────────────────────────────

export type SubscriptionType = 'lunch' | 'coffee' | 'lunch_coffee'

export interface Subscription {
  id: number
  type: SubscriptionType
  active: boolean
  expiresAt: string
}

export interface SubscriptionPlan {
  type: SubscriptionType
  name: string
  description: string
  priceKopecks: number
  icon: string
}

// ─── Купоны ──────────────────────────────────────────────

export type CouponType = 'lunch' | 'coffee'

export interface CouponBalance {
  type: CouponType
  balance: number
}

export interface CouponTransaction {
  id: number
  delta: number
  description: string
  createdAt: string
}

export interface CouponPackage {
  quantity: 5 | 10 | 20
  priceKopecks: number
  label: string
  badge: string | null
}

// ─── Платежи ─────────────────────────────────────────────

export interface InitPaymentResponse {
  paymentUrl: string
  paymentId: string
}

// ─── API ─────────────────────────────────────────────────

export interface ApiError {
  error: string
  message?: string
}

export interface UserProfile {
  user: AppUser
  coupons: CouponBalance[]
  subscriptions: Subscription[]
}
