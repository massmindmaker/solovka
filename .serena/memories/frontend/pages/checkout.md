# CheckoutPage — Оформление заказа

Файл: `frontend/src/pages/Checkout/CheckoutPage.tsx`

## Функциональность
- Адрес доставки (обязательный, свободный текст) — placeholder "Улица, дом, квартира" (Phase 1)
- Выбор времени — кнопки из `DELIVERY_TIMES` (11:30–14:00)
- Комментарий (необязательный, max 200 символов)
- Выбор оплаты: карта / купон / подписка
- Итог заказа: список позиций + сумма
- Sticky CTA: "Оплатить — XXX ₽" (disabled если адрес пустой)
- BottomNav СКРЫТ на этой странице

## Логика оплаты

### Карта (T-Bank)
1. `createOrder(payload)` → `order.id`
2. `initPayment(order.id)` → `paymentUrl`
3. popup подтверждение → `window.open(paymentUrl)` (TODO: → `openLink()`)
4. `clearCart()` → `/order-success/:id`

### Купон / Подписка
1. `createOrder(payload)` → сразу success
2. haptic success
3. `clearCart()` → `/order-success/:id`

## Доступность оплаты
- **Купон**: disabled если `getCouponBalance('lunch') === 0` (→ rename Phase 1)
- **Подписка**: disabled если `!hasActiveSubscription('lunch')`

## Состояния
```typescript
deliveryRoom: string     // → deliveryAddress (Phase 1)
deliveryTime: DeliveryTime // default: '12:00'
comment: string
paymentMethod: PaymentMethod // 'card' | 'coupon' (was 'talon')
submitting: boolean
```

## Phase 1 изменения
- `deliveryRoom` → `deliveryAddress`
- `SAVED_ROOM_KEY` → `SAVED_ADDRESS_KEY`
- Убрать `ROOM_SUGGESTIONS`
- `PaymentMethod 'talon'` → `'coupon'`
- `getTalonBalance` → `getCouponBalance`
- Placeholder: "Улица, дом, квартира"
