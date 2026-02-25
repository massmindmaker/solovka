# CheckoutPage — Оформление заказа

Файл: `frontend/src/pages/Checkout/CheckoutPage.tsx`

## Функциональность
- Поле ввода кабинета/места доставки (обязательное, валидация: не пустое)
- Выбор времени доставки — кнопки из `DELIVERY_TIMES` (`utils/index.ts`)
- Необязательный комментарий (textarea, max 200 символов)
- Выбор способа оплаты: карта / талон / подписка
- Итог заказа (список позиций + сумма)
- MainButton: "Оплатить — XXX ₽" (disabled если поле кабинета пустое)

## Логика оплаты

### Карта (T-Bank)
1. `createOrder(payload)` → получить `order.id`
2. `initPayment(order.id)` → получить `paymentUrl`
3. `tg.showPopup` с подтверждением → `window.open(paymentUrl)`
4. `clearCart()` → `navigate('/order-success/:id')`

> **TODO для прода:** заменить `window.open` на `openLink()` из `@tma.js/sdk`

### Талон / Подписка
1. `createOrder(payload)` → сразу success
2. `haptic.notificationOccurred('success')`
3. `clearCart()` → `navigate('/order-success/:id')`

## Доступность способов оплаты
- **Талон**: отключён если `getTalonBalance('lunch') === 0`
- **Подписка**: отключена если `!hasActiveSubscription('lunch')`
- Данные берутся из `userStore`

## Вспомогательные компоненты (внутри файла)
- `<Section title>` — секция с заголовком
- `<PaymentOption>` — кнопка выбора способа оплаты (radio-style)

## Импорты
- `DELIVERY_TIMES` — из `utils/index.ts`
- `type DeliveryTime` — из `utils/index.ts` (реэкспорт)
- `createOrder`, `initPayment` — из `api/orders.ts`
- `useCartStore`, `useUserStore` — stores

## Состояния
```typescript
step: 'details' | 'payment'   // зарезервировано для future multi-step
deliveryRoom: string           // обязательное поле
deliveryTime: DeliveryTime     // default: '12:00'
comment: string                // необязательное
paymentMethod: PaymentMethod   // 'card' | 'talon' | 'subscription'
submitting: boolean            // блокирует повторный submit
```
