import type { Category, MenuItem, Order, UserProfile } from '@/types'

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: 'Меню дня', slug: 'daily', icon: '⭐', sortOrder: 0 },
  { id: 2, name: 'Бизнес-ланч', slug: 'business-lunch', icon: '🍱', sortOrder: 1 },
  { id: 3, name: 'Холодные закуски', slug: 'cold-snacks', icon: '🥗', sortOrder: 2 },
  { id: 4, name: 'Первые блюда', slug: 'first-courses', icon: '🍲', sortOrder: 3 },
  { id: 5, name: 'Вторые блюда', slug: 'second-courses', icon: '🍽', sortOrder: 4 },
  { id: 6, name: 'Гарниры', slug: 'sides', icon: '🍚', sortOrder: 5 },
  { id: 7, name: 'Напитки', slug: 'drinks', icon: '🥤', sortOrder: 6 },
]

export const MOCK_MENU_ITEMS: MenuItem[] = [
  // ── Холодные закуски ──────────────────────────────────
  {
    id: 1, categoryId: 3, categorySlug: 'cold-snacks',
    name: 'Салат ОЛИВЬЕ ПО-ДОМАШНЕМУ с ветчиной',
    description: '120 гр',
    priceKopecks: 12000,
    imageUrl: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 2, categoryId: 3, categorySlug: 'cold-snacks',
    name: 'Салат ГРЕЧЕСКИЙ',
    description: '120 гр',
    priceKopecks: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 3, categoryId: 3, categorySlug: 'cold-snacks',
    name: 'Салат из свёклы с черносливом и майонезом',
    description: '120 гр',
    priceKopecks: 12000,
    imageUrl: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 4, categoryId: 3, categorySlug: 'cold-snacks',
    name: 'Винегрет овощной',
    description: '120 гр',
    priceKopecks: 12000,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },

  // ── Первые блюда (супы) ───────────────────────────────
  {
    id: 5, categoryId: 4, categorySlug: 'first-courses',
    name: 'Суп из ОВОЩЕЙ с курицей и сметаной',
    description: '300 гр',
    priceKopecks: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 6, categoryId: 4, categorySlug: 'first-courses',
    name: 'СУП-ХАРЧО с говядиной',
    description: '300 гр',
    priceKopecks: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 7, categoryId: 4, categorySlug: 'first-courses',
    name: 'Суп гороховый с картофелем на овощном бульоне',
    description: '300 гр. ПОСТНОЕ',
    priceKopecks: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },

  // ── Вторые блюда ──────────────────────────────────────
  {
    id: 8, categoryId: 5, categorySlug: 'second-courses',
    name: 'Грудка куриная СУ-ВИД',
    description: '100 гр',
    priceKopecks: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 9, categoryId: 5, categorySlug: 'second-courses',
    name: 'СТЕЙК из свиной корейки',
    description: '100 гр',
    priceKopecks: 28500,
    imageUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 10, categoryId: 5, categorySlug: 'second-courses',
    name: 'Поджарка из свинины',
    description: '100/50 гр',
    priceKopecks: 27500,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 11, categoryId: 5, categorySlug: 'second-courses',
    name: 'ФРИКАСЕ из куриной грудки',
    description: '200 гр',
    priceKopecks: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 12, categoryId: 5, categorySlug: 'second-courses',
    name: 'Биточки картофельные, соус грибной',
    description: '150/50 гр. ПОСТНОЕ',
    priceKopecks: 15000,
    imageUrl: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 13, categoryId: 5, categorySlug: 'second-courses',
    name: 'Паста с соусом Болоньезе',
    description: '300 гр',
    priceKopecks: 27500,
    imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 14, categoryId: 5, categorySlug: 'second-courses',
    name: 'Шашлык из свиной шейки',
    description: '100 гр',
    priceKopecks: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },

  // ── Гарниры ───────────────────────────────────────────
  {
    id: 15, categoryId: 6, categorySlug: 'sides',
    name: 'Картофель ПО-СТОЛИЧНОМУ',
    description: '150 гр',
    priceKopecks: 15000,
    imageUrl: 'https://images.unsplash.com/photo-1568569350062-ebfa3cb195df?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 16, categoryId: 6, categorySlug: 'sides',
    name: 'Рис отварной',
    description: '150 гр',
    priceKopecks: 12500,
    imageUrl: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 17, categoryId: 6, categorySlug: 'sides',
    name: 'Гречка отварная',
    description: '150 гр',
    priceKopecks: 10000,
    imageUrl: 'https://images.unsplash.com/photo-1595908129746-57ca1a63dd4d?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 18, categoryId: 6, categorySlug: 'sides',
    name: 'Спагетти с маслом',
    description: '150 гр',
    priceKopecks: 10000,
    imageUrl: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 19, categoryId: 6, categorySlug: 'sides',
    name: 'ОВОЩИ НА ПАРУ',
    description: '150 гр',
    priceKopecks: 19500,
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop&q=80',
    available: true, isBusinessLunch: false,
  },

  // ── Напитки ───────────────────────────────────────────
  {
    id: 20, categoryId: 7, categorySlug: 'drinks',
    name: 'МОРС',
    description: '320 мл',
    priceKopecks: 8500,
    imageUrl: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 21, categoryId: 7, categorySlug: 'drinks',
    name: 'МОРС КУВШИН',
    description: '1 литр',
    priceKopecks: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1560508179-b2c9a3f8e92b?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 22, categoryId: 7, categorySlug: 'drinks',
    name: 'Сок ФРЕШ Апельсиновый',
    description: '200 мл',
    priceKopecks: 15000,
    imageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
  {
    id: 23, categoryId: 7, categorySlug: 'drinks',
    name: 'Чай ЧАЙНИК',
    description: 'Заварочный чайник',
    priceKopecks: 15000,
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
    available: true, isBusinessLunch: false,
  },
]

// Меню дня — айтемы со специальным флагом
export const MOCK_DAILY_ITEM_IDS = [1, 5, 8, 15, 20]

export const MOCK_PROFILE: UserProfile = {
  user: {
    id: 1,
    telegramId: 123456789,
    firstName: 'Иван',
    lastName: 'Петров',
    username: 'ivanpetrov',
    notifyDailyMenu: true,
    createdAt: new Date().toISOString(),
  },
  talons: [
    { type: 'lunch', balance: 3 },
    { type: 'coffee', balance: 0 },
  ],
  subscriptions: [
    {
      id: 1,
      type: 'lunch',
      active: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
}

export const MOCK_ORDERS: Order[] = [
  {
    id: 1234,
    status: 'preparing',
    totalKopecks: 50000,
    deliveryRoom: 'Кабинет 305',
    deliveryTime: '12:30',
    comment: 'Без лука, пожалуйста',
    paidWith: 'card',
    createdAt: new Date().toISOString(),
    items: [
      { id: 1, itemId: 9, itemName: 'СТЕЙК из свиной корейки', quantity: 1, priceKopecks: 28500 },
      { id: 2, itemId: 5, itemName: 'Суп из ОВОЩЕЙ с курицей', quantity: 1, priceKopecks: 35000 },
      { id: 3, itemId: 20, itemName: 'МОРС', quantity: 2, priceKopecks: 8500 },
    ],
  },
  {
    id: 1198,
    status: 'delivered',
    totalKopecks: 35000,
    deliveryRoom: 'Кабинет 305',
    deliveryTime: '13:00',
    comment: null,
    paidWith: 'talon',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { id: 4, itemId: 10, itemName: 'Поджарка из свинины', quantity: 1, priceKopecks: 27500 },
      { id: 5, itemId: 16, itemName: 'Рис отварной', quantity: 1, priceKopecks: 12500 },
    ],
  },
]
