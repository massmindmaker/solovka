# Архитектура системы "Solovka"

Последнее обновление: **28.02.2026**

## Общая схема — 2 Mini App, 1 Vercel проект

```
┌──────────────────────────────────────────────────────────────┐
│                     TELEGRAM CLIENT                          │
│                                                              │
│  ┌──────────────────────┐   ┌──────────────────────────┐    │
│  │  КЛИЕНТСКИЙ Mini App │   │  АДМИНСКИЙ Mini App      │    │
│  │  index.html          │   │  admin.html              │    │
│  │  React + Vite        │   │  React + Vite            │    │
│  │                      │   │                          │    │
│  │  Pages: Menu, Cart,  │   │  role=admin:             │    │
│  │  Checkout, Orders,   │   │    Orders, Menu, Daily,  │    │
│  │  Profile, Coupons,   │   │    Stats                 │    │
│  │  Favorites           │   │  role=delivery:          │    │
│  └──────────┬───────────┘   │    Active, History       │    │
│              │               └────────────┬─────────────┘    │
│              │  HTTP (tma auth)           │                   │
└──────────────┼───────────────────────────┼───────────────────┘
               │                           │
     ┌─────────▼───────────────────────────▼──────────┐
     │              VERCEL (CDN + Edge)                │
     │   solovka-eight.vercel.app                      │
     │   /        → index.html (клиент SPA)            │
     │   /admin/* → admin.html (админ SPA)             │
     │   /api/*   → serverless functions               │
     └─────────────────────┬──────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
   ┌─────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │ /api/menu   │  │ /api/orders │  │ /api/admin/ │
   │ /api/users  │  │ /api/coupons│  │ /api/deliv/ │
   │ /api/payment│  │ Serverless  │  │ Serverless  │
   └─────┬──────┘  └──────┬──────┘  └──────┬──────┘
         │                │                 │
         └────────────────┼─────────────────┘
                          │
                ┌─────────▼──────────┐
                │  NEON PostgreSQL   │
                │  (Serverless DB)   │
                └────────────────────┘

    Параллельно:
┌──────────────────┐      ┌──────────────────┐
│  VERCEL CRON     │      │   T-BANK API     │
│  07:00 UTC пн-пт │      │   Эквайринг      │
│  /api/cron/menu  │      │   PaymentURL     │
└────────┬─────────┘      └──────────────────┘
         │
┌────────▼────────┐
│  TELEGRAM BOT   │
│  grammy         │
│  1 бот, 3 роли  │
│  /admin команда │
└─────────────────┘
```

## Vite Multi-Page Build

```typescript
// vite.config.ts
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),       // → клиент
        admin: resolve(__dirname, 'admin.html'),      // → админ+курьер
      },
    },
  },
})
```

**Результат билда**: два независимых JS-бандла, общий код (types/utils/api) tree-shaken.

## Vercel Rewrites (vercel.json)

```json
{
  "rewrites": [
    { "source": "/admin/(.*)", "destination": "/admin.html" },
    { "source": "/((?!api|admin\\.html|assets).*)", "destination": "/index.html" }
  ]
}
```

## Структура файлов (плановая после Phase 2)

```
frontend/
├── index.html              ← entry: клиентский app
├── admin.html              ← entry: админ + курьер app
├── src/
│   ├── main.tsx            ← клиентский entry point
│   ├── App.tsx             ← клиентский роутинг
│   │
│   ├── types/index.ts      ← ОБЩИЕ типы (оба app используют)
│   ├── api/                ← ОБЩИЕ API клиенты
│   │   ├── client.ts       ← fetch wrapper + tma auth
│   │   ├── menu.ts         ← fetchMenu, fetchCategories, fetchMenuItems
│   │   ├── orders.ts       ← fetchOrders, createOrder, initPayment
│   │   └── profile.ts      ← fetchProfile, buyCoupons
│   ├── utils/index.ts      ← ОБЩИЕ утилиты
│   ├── hooks/              ← ОБЩИЕ хуки
│   │
│   ├── pages/              ← КЛИЕНТСКИЕ страницы
│   ├── components/         ← КЛИЕНТСКИЕ компоненты
│   ├── store/              ← КЛИЕНТСКИЕ сторы
│   ├── mock/               ← мок-данные (dev only)
│   │
│   └── admin/              ← АДМИН-МОДУЛЬ (Phase 2+3)
│       ├── main.tsx        ← админ entry point
│       ├── AdminApp.tsx    ← роутинг: role=admin → админ, role=delivery → курьер
│       ├── pages/
│       │   ├── AdminOrdersPage.tsx
│       │   ├── AdminMenuPage.tsx
│       │   ├── AdminDailyMenuPage.tsx
│       │   ├── AdminStatsPage.tsx     (Phase 4)
│       │   ├── DeliveryOrdersPage.tsx
│       │   └── DeliveryHistoryPage.tsx
│       ├── components/
│       │   ├── AdminNav.tsx
│       │   └── DeliveryNav.tsx
│       └── store/
│           ├── adminStore.ts
│           └── deliveryStore.ts

api/                        ← Vercel serverless (ОБЩЕЕ API)
├── lib/                    ← общие утилиты сервера
├── admin/                  ← Phase 2: эндпоинты для админа
│   ├── orders.ts           GET/PUT
│   ├── menu.ts             GET/POST/PUT/DELETE
│   └── daily-menu.ts       GET/PUT
├── delivery/               ← Phase 3: эндпоинты для курьера
│   ├── orders.ts           GET (ready orders)
│   ├── pickup.ts           PUT (взять заказ)
│   ├── complete.ts         PUT (доставлен)
│   └── history.ts          GET (история за сегодня)
├── coupons/                ← Phase 1: переименовано из talons/
│   ├── buy.ts
│   └── webhook.ts
├── orders/
├── payment/
├── users/
├── menu.ts
└── cron/
```

## Роли и доступ

| Роль | Mini App | Маршруты | API доступ |
|------|---------|----------|-----------|
| `customer` | index.html | /, /item/:id, /cart, /checkout, /orders, /profile, /coupons, /favorites | /api/menu, /api/orders, /api/users, /api/coupons, /api/payment |
| `admin` | admin.html | /admin/orders, /admin/menu, /admin/daily, /admin/stats | + /api/admin/* |
| `delivery` | admin.html | /delivery, /delivery/history | + /api/delivery/* |

### Telegram Bot — как открываются Mini App

1. **Все пользователи** → главная кнопка бота → `web_app: { url: '.../index.html' }`
2. **Команда `/admin`** → бот проверяет `users.role` в БД:
   - `admin` или `delivery` → inline кнопка с `web_app: { url: '.../admin.html' }`
   - `customer` → "Нет доступа"

### AdminApp.tsx — внутренний роутинг

```tsx
// Внутри admin.html Mini App
const { role } = useAdminAuth(); // GET /api/users/me → role
if (role === 'admin')    → /admin/orders, /admin/menu, /admin/daily, /admin/stats
if (role === 'delivery') → /delivery, /delivery/history
if (role === 'customer') → экран "Нет доступа"
```

## Жизненный цикл заказа (обновлённый)

```
pending → paid → ready (админ собрал) → delivering (курьер взял) → delivered
                                      → cancelled (админ, до delivering)
```

- `pending` — создан, ожидает оплаты
- `paid` — оплачен (карта/купон/подписка)
- `ready` — админ нажал "Готово" (собрал заказ)
- `delivering` — курьер забрал заказ (Phase 1: добавить в enum)
- `delivered` — курьер доставил
- `cancelled` — отменён (админ)

**Нет статуса `preparing`** — вся еда уже готова, админ только собирает заказы.

## Безопасность

1. **Auth**: `Authorization: tma <initData>` → validate + parse → user.telegram_id → upsert
2. **Role check**: admin/delivery API middleware проверяет `users.role`
3. **Webhook verification**: T-Bank Token (SHA-256), Cron CRON_SECRET
4. **SQL**: template literals Neon (параметризованные запросы)

## Масштабирование (на будущее)
1. Redis → Upstash (кэш меню, rate limiting)
2. Очереди → Upstash QStash (массовые уведомления)
3. Real-time → polling с интервалом (для админки заказов)
4. Neon → автомасштабирование (pay per use)

## Среда разработки
- **Dev**: `import.meta.env.DEV` → мок-данные, без API
- **Prod**: реальные API, Neon DB, T-Bank
- **Preview**: каждый push → Vercel preview URL
