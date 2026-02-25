# Frontend — Компоненты и хуки: API справочник

## Хуки

### `useTelegram()` → `hooks/useTelegram.ts`
```typescript
const { tg, isDev, colorScheme, user, initData, haptic } = useTelegram()

// tg — объект Telegram.WebApp (или MOCK в браузере)
// isDev — true если нет реального Telegram
// user — { id, first_name, last_name?, username?, language_code?, is_premium? }
// haptic.impactOccurred('light' | 'medium' | 'heavy')
// haptic.notificationOccurred('success' | 'error' | 'warning')
// haptic.selectionChanged()
// tg.showPopup({ title?, message, buttons }, callback)
```

### `useMainButton(options)` → `hooks/useMainButton.ts`
```typescript
useMainButton({
  text: 'Оформить заказ — 350 ₽',
  onClick: () => handleSubmit(),
  disabled?: boolean,   // серая кнопка
  loading?: boolean,    // спиннер внутри
  visible?: boolean,    // по умолчанию true
})
// Автоматически скрывает кнопку при unmount компонента
```

### `useBackButton(onBack?)` → `hooks/useBackButton.ts`
```typescript
useBackButton()            // navigate(-1) при нажатии
useBackButton(() => setStep(prev - 1))  // кастомный обработчик
// Автоматически скрывает BackButton при unmount
```

---

## Компоненты

### `<Spinner>` / `<FullScreenSpinner>`
```typescript
<Spinner size="sm" | "md" | "lg" className="..." />
<FullScreenSpinner />  // центрирован на весь экран
```

### `<EmptyState>`
```typescript
<EmptyState
  icon="🛒"
  title="Корзина пуста"
  description="Добавьте блюда из меню"     // опционально
  action={<button>Перейти в меню</button>}  // опционально
/>
```

### `<Counter>`
```typescript
<Counter
  value={quantity}
  onDecrement={() => setQty(q => q - 1)}
  onIncrement={() => setQty(q => q + 1)}
  min={0}      // по умолчанию 0
  max={99}     // по умолчанию 99
  size="sm" | "md"  // по умолчанию "md"
  className="..."
/>
```

### `<StatusBadge>`
```typescript
<StatusBadge status="pending" | "paid" | "preparing" | "ready" | "delivered" | "cancelled" />
// Рендерит цветной badge с русским названием статуса
```

### `<BottomNav>`
```typescript
<BottomNav />
// Фиксированная нижняя навигация: Меню / Заказы / Профиль
// Показывает badge с количеством товаров на вкладке Меню
// safe-area-inset-bottom учтён через pb-[env(safe-area-inset-bottom)]
```

---

## Stores

### `useCartStore` → `store/cartStore.ts`
```typescript
const {
  items,            // CartItem[]
  addItem,          // (item: Omit<CartItem, 'quantity'>) => void
  removeItem,       // (id: number) => void
  updateQuantity,   // (id: number, quantity: number) => void  (qty=0 → удаляет)
  clearCart,        // () => void
  totalKopecks,     // () => number
  totalCount,       // () => number
} = useCartStore()
```
Персистируется в localStorage как `solovka-cart`.

### `useUserStore` → `store/userStore.ts`
```typescript
const {
  profile,              // UserProfile | null
  loading,              // boolean
  setProfile,           // (p: UserProfile) => void
  setLoading,           // (b: boolean) => void
  getTalonBalance,      // (type: 'lunch' | 'coffee') => number
  hasActiveSubscription,// (type: 'lunch' | 'coffee') => boolean
} = useUserStore()
```

---

## API модули (все с dev mock)

### `api/menu.ts`
```typescript
fetchCategories(): Promise<Category[]>
fetchMenuItems(categorySlug?: string): Promise<MenuItem[]>
fetchMenuItem(id: number): Promise<MenuItem>
```

### `api/orders.ts`
```typescript
fetchOrders(): Promise<Order[]>
createOrder(payload: CreateOrderPayload): Promise<Order>
initPayment(orderId: number): Promise<{ paymentUrl: string }>
```

### `api/profile.ts`
```typescript
fetchProfile(): Promise<UserProfile>
buyTalons(type: TalonType, quantity: 5 | 10 | 20): Promise<{ newBalance: number }>
buySubscription(type: string): Promise<{ paymentUrl: string }>
toggleNotification(enabled: boolean): Promise<void>
```

---

## Утилиты (`utils/index.ts`)

```typescript
cn(...classes)                    // clsx + tailwind-merge
formatPrice(kopecks: number)      // → "350 ₽"
formatDate(iso: string)           // → "26 февраля"
formatDateTime(iso: string)       // → "26 фев, 12:30"
formatDateShort(iso: string)      // → "26 фев"
plural(n, one, few, many)         // склонение: plural(3,'талон','талона','талонов') → "талона"
ORDER_STATUS_LABEL                // Record<OrderStatus, string> — русские названия
ORDER_STATUS_COLOR                // Record<OrderStatus, string> — Tailwind классы
ACTIVE_ORDER_STATUSES             // OrderStatus[] — активные статусы
DELIVERY_TIMES                    // ['11:30','12:00','12:30','13:00','13:30','14:00']
TALON_PACKAGES                    // TalonPackage[] — пакеты талонов
SUBSCRIPTION_PLANS                // SubscriptionPlan[] — планы подписок
```
