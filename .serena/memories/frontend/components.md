# Frontend — Компоненты, хуки, stores: API справочник

Последнее обновление: **28.02.2026**

---

## Хуки

### `useTelegram()` → `hooks/useTelegram.ts`
```typescript
const { tg, isDev, colorScheme, user, initData, haptic } = useTelegram()
// tg — Telegram.WebApp (или MOCK в браузере)
// isDev — true если нет реального Telegram
// user — { id, first_name, last_name?, username?, language_code?, is_premium? }
// haptic.impactOccurred('light' | 'medium' | 'heavy')
// haptic.notificationOccurred('success' | 'error' | 'warning')
// haptic.selectionChanged()
```

### `useMainButton(options)` → `hooks/useMainButton.ts`
```typescript
useMainButton({
  text: 'Оформить заказ — 350 ₽',
  onClick: () => handleSubmit(),
  disabled?: boolean,
  loading?: boolean,
  visible?: boolean,  // default true
})
// Автоматически скрывает при unmount
```

### `useBackButton(onBack?)` → `hooks/useBackButton.ts`
```typescript
useBackButton()            // navigate(-1)
useBackButton(() => cb())  // custom handler
// Автоматически скрывает при unmount
```

### `useRepeatOrder()` → `hooks/useRepeatOrder.ts`
```typescript
const { repeatOrder } = useRepeatOrder()
repeatOrder(order.items) // добавляет все items в корзину, navigate('/cart')
```

---

## Компоненты

### `<Spinner>` / `<FullScreenSpinner>`
```tsx
<Spinner size="sm" | "md" | "lg" className="..." />
<FullScreenSpinner />  // центрирован на весь экран
```

### `<EmptyState>`
```tsx
<EmptyState
  icon="🛒"
  title="Корзина пуста"
  description="Добавьте блюда из меню"
  action={<button>Перейти в меню</button>}
/>
```

### `<Counter>`
```tsx
<Counter
  value={quantity}
  onDecrement={() => ...}
  onIncrement={() => ...}
  min={0} max={99}
  size="sm" | "md"
/>
// Touch targets: sm=32px, md=40px (после polish)
```

### `<StatusBadge>`
```tsx
<StatusBadge status="pending" | "paid" | "preparing" | "ready" | "delivered" | "cancelled" />
// Цветной badge с русским названием
```

### `<BottomNav>`
```tsx
<BottomNav />
// 4 вкладки: Меню / Заказы / Избранное / Профиль
// Badge с количеством товаров в корзине
// safe-area-inset-bottom
// СКРЫТ на: /item/, /cart, /checkout, /order-success/, /orders/:id
```

### `<ErrorState>`
```tsx
<ErrorState message="Не удалось загрузить" onRetry={() => refetch()} />
```

### `<Skeleton>`
```tsx
<MenuSkeleton />      // сетка карточек меню
<ItemSkeleton />      // страница блюда
<OrdersSkeleton />    // список заказов
<ProfileSkeleton />   // страница профиля
<TalonsSkeleton />    // страница талонов/купонов
// Все с shimmer анимацией 1.5s
```

---

## Stores

### `useCartStore` → `store/cartStore.ts`
```typescript
const {
  items,            // CartItem[]
  addItem,          // (item: Omit<CartItem, 'quantity'>) => void
  removeItem,       // (id: number) => void
  updateQuantity,   // (id: number, qty: number) => void (qty=0 → удаляет)
  clearCart,        // () => void
  totalKopecks,     // () => number
  totalCount,       // () => number
} = useCartStore()
// Persist: localStorage 'solovka-cart'
```

### `useUserStore` → `store/userStore.ts`
```typescript
const {
  profile,              // UserProfile | null
  loading,              // boolean
  setProfile,           // (p: UserProfile) => void
  setLoading,           // (b: boolean) => void
  getTalonBalance,      // (type: 'lunch'|'coffee') => number  (→ getCouponBalance Phase 1)
  hasActiveSubscription,// (type: 'lunch'|'coffee') => boolean
} = useUserStore()
```

### `useFavoritesStore` → `store/favoritesStore.ts`
```typescript
const {
  favoriteIds,    // number[]
  toggleFavorite, // (id: number) => void
  isFavorite,     // (id: number) => boolean
} = useFavoritesStore()
// Persist: localStorage 'solovka-favorites'
```

---

## Утилиты (`utils/index.ts`)

```typescript
cn(...classes)                    // clsx + tailwind-merge
formatPrice(kopecks: number)      // → "350 ₽"
formatDate(iso: string)           // → "26 февраля"
formatDateTime(iso: string)       // → "26 фев, 12:30"
formatDateShort(iso: string)      // → "26 фев"
plural(n, one, few, many)         // склонение: plural(3,'купон','купона','купонов')

ORDER_STATUS_LABEL                // Record<OrderStatus, string>
ORDER_STATUS_COLOR                // Record<OrderStatus, string> — Tailwind классы
ACTIVE_ORDER_STATUSES             // OrderStatus[] — активные статусы
DELIVERY_TIMES                    // ['11:30','12:00','12:30','13:00','13:30','14:00']
TALON_PACKAGES                    // TalonPackage[] (→ COUPON_PACKAGES Phase 1)
SUBSCRIPTION_PLANS                // SubscriptionPlan[]
```

---

## API модули

### `api/client.ts`
```typescript
// Базовый fetch, Authorization: tma + initData
// Dev: пустой initData → BOT_TOKEN=dev на сервере пропускает
```

### `api/menu.ts`
```typescript
fetchMenu()           // GET /api/menu — один запрос, module cache
fetchCategories()     // из кеша
fetchMenuItems(slug?) // из кеша, фильтр по slug/dailyItemIds
fetchMenuItem(id)     // из кеша
clearMenuCache()      // сброс
```

### `api/orders.ts`
```typescript
fetchOrders()         // GET /api/orders (dev: MOCK_ORDERS)
fetchOrder(id)        // GET /api/orders/:id (dev: mock)
createOrder(payload)  // POST /api/orders
initPayment(orderId)  // POST /api/payment/init
```

### `api/profile.ts`
```typescript
fetchProfile()                    // GET /api/users/me (dev: MOCK_PROFILE)
buyTalons(type, qty)              // POST /api/talons/buy (→ buyCoupons Phase 1)
buySubscription(type)             // POST /api/subscriptions/buy
toggleNotification(enabled)       // PUT /api/users/me/notifications
```
