# Frontend — Прогресс разработки

Последнее обновление: все страницы завершены, сборка проходит без ошибок.

---

## Статус задач

| Задача | Статус |
|--------|--------|
| Scaffolding: Vite + React + TS | ✅ Done |
| Dependencies | ✅ Done |
| Config: vite, tsconfig, tailwind, aliases | ✅ Done |
| Types | ✅ Done |
| Utils | ✅ Done |
| Hooks | ✅ Done |
| Mock data | ✅ Done |
| Stores | ✅ Done |
| API client | ✅ Done |
| App.tsx + routing | ✅ Done |
| Components: base UI | ✅ Done |
| MenuPage | ✅ Done |
| ItemPage | ✅ Done |
| CartPage | ✅ Done |
| CheckoutPage | ✅ Done |
| OrderSuccessPage | ✅ Done |
| OrdersPage | ✅ Done |
| ProfilePage | ✅ Done |
| TalonsPage | ✅ Done |
| tsc --noEmit clean | ✅ Done |
| npm run build clean | ✅ Done |

---

## Страницы — краткое описание

### OrdersPage (`/orders`)
- Два таба: "Активные" (pending/paid/preparing/ready) + "История" (delivered/cancelled)
- Каждый заказ — карточка `OrderCard` с номером, статусом, позициями (max 3 + "ещё N"), суммой, адресом, временем, датой
- Клик по заказу → `/order-success/:id`
- Пустое состояние с CTA "Перейти в меню" или "История пуста"

### ProfilePage (`/profile`)
- Аватар с инициалом + имя + username
- Секция "Талоны": баланс обеденных и кофейных, кнопка "Пополнить →"
- Секция "Подписки": статус каждого плана из `SUBSCRIPTION_PLANS`, кнопка "Купить" или бейдж "Активна" + дата истечения
- Секция "Уведомления": Toggle компонент для `notifyDailyMenu` с оптимистичным обновлением

### TalonsPage (`/talons`)
- Два таба-кнопки: "🍱 Обед" / "☕ Кофе" с балансом
- Список пакетов `TALON_PACKAGES` с ценой за талон и общей ценой
- История транзакций (мок-данные, API для истории пока не реализован на беке)
- Описание про срок действия

---

## Важные исправления при сборке

1. `PaymentMethod` — живёт в `@/types`, не в `@/utils` (CheckoutPage.tsx исправлен)
2. `Spinner` — default export, не named export (OrdersPage.tsx исправлен)
3. `profile` spread в async callbacks — TypeScript не видит null guard, использован `profile!` (non-null assertion)
4. `@tailwindcss/vite` — не был установлен (добавлен через npm install)

---

## Структура файлов (финал)

```
frontend/src/
├── types/index.ts
├── utils/index.ts
├── mock/data.ts
├── hooks/
│   ├── useTelegram.ts
│   ├── useMainButton.ts
│   └── useBackButton.ts
├── store/
│   ├── cartStore.ts
│   └── userStore.ts
├── api/
│   ├── client.ts
│   ├── menu.ts
│   ├── orders.ts
│   └── profile.ts
├── components/
│   ├── Spinner.tsx         — default export + named FullScreenSpinner
│   ├── EmptyState.tsx
│   ├── Counter.tsx
│   ├── BottomNav.tsx
│   └── StatusBadge.tsx
├── pages/
│   ├── Menu/MenuPage.tsx
│   ├── Item/ItemPage.tsx
│   ├── Cart/CartPage.tsx
│   ├── Checkout/CheckoutPage.tsx
│   ├── OrderSuccess/OrderSuccessPage.tsx
│   ├── Orders/OrdersPage.tsx
│   ├── Profile/ProfilePage.tsx
│   └── Talons/TalonsPage.tsx
├── App.tsx
├── main.tsx
└── index.css
```

## Маршруты

```
/                    → MenuPage
/item/:id            → ItemPage
/cart                → CartPage
/checkout            → CheckoutPage
/order-success/:id   → OrderSuccessPage
/orders              → OrdersPage
/profile             → ProfilePage
/talons              → TalonsPage
```
