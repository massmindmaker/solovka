# Solovka — Telegram Mini App для корпоративной столовой "Огромнов"

Последнее обновление: **28.02.2026**

## Цель проекта
Telegram Mini App для заказа еды в корпоративной столовой "Огромнов".
Клиенты просматривают меню, оформляют заказы, покупают купоны.
Отдельное Mini App для сотрудников столовой (админ + курьер).

## Архитектура: 2 Mini App, 1 Vercel проект

```
solovka-eight.vercel.app/           → Клиентский Mini App (index.html)
solovka-eight.vercel.app/admin.html → Админ + Курьер Mini App (admin.html)
```

- **Vite Multi-Page**: один `vite.config.ts`, два entry point (`index.html` + `admin.html`)
- **API общее**: все serverless functions в `api/` используются обоими приложениями
- **Общие модули**: `types/`, `api/`, `utils/` — используются обоими app
- **Telegram Bot**: одна кнопка → клиентский app. Команда `/admin` → бот проверяет роль → отправляет inline кнопку с admin.html

## Tech Stack

### Frontend (Mini App)
- **React 18** + **Vite** + **TypeScript**
- **@tma.js/sdk** — Telegram Mini Apps SDK
- **Tailwind CSS v4** (`@tailwindcss/vite` plugin) — ВАЖНО: oklch() не работает в TG WebView, нужны hex overrides через `@theme`
- **Zustand** — управление состоянием (persist для корзины, избранного)
- **React Router v6** — навигация

### Backend
- **Vercel Serverless Functions** (TypeScript, `/api/` в корне проекта)
- **@neondatabase/serverless** — Neon PostgreSQL
- **grammy** — Telegram Bot (уведомления)
- **T-Bank эквайринг** — платежи картой

### Инфраструктура
- **Vercel**: https://solovka-eight.vercel.app (production, auto-deploy из master)
- **GitHub**: https://github.com/massmindmaker/solovka
- **Neon** PostgreSQL:
  - Project: `fancy-king-10101433`, DB: `neondb`
  - Host: `ep-plain-unit-aivuc2zk.c-4.us-east-1.aws.neon.tech`
  - Pooled: `postgresql://neondb_owner:npg_9KxQpPXBdoz4@ep-plain-unit-aivuc2zk-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require`
- **Vercel Cron**: `0 7 * * 1-5` (07:00 UTC = 10:00 МСК, пн-пт)
- Последний коммит: `2b0e3c5`

## Vercel env vars (Production Dashboard)

| Ключ | Значение |
|------|---------|
| `DATABASE_URL` | pooled Neon connection string |
| `BOT_TOKEN` | `dev` ← заменить на реальный после создания бота |
| `ADMIN_CHAT_ID` | `0` ← заменить |
| `CRON_SECRET` | установлен |
| `APP_URL` | `https://solovka-eight.vercel.app` |

> `BOT_TOKEN=dev` → validateInitData пропускается, принимается любой initData

## Структура монорепозитория (актуальная)

```
solovka/
├── api/                          ← Vercel serverless (ДЕПЛОЯТСЯ ЭТИ)
│   ├── lib/                      auth, bot, constants, db, tbank, userHelper, utils
│   ├── cron/daily-menu.ts
│   ├── menu.ts
│   ├── orders/index.ts, [id].ts
│   ├── payment/init.ts, webhook.ts
│   ├── subscriptions/buy.ts, webhook.ts
│   ├── talons/buy.ts, webhook.ts      ← БУДУТ: api/coupons/ (Phase 1)
│   └── users/me.ts, me/notifications.ts
│
├── frontend/                     ← Mini App SPA
│   ├── index.html                ← entry: клиентский app
│   ├── admin.html                ← entry: админ+курьер (БУДЕТ: Phase 2)
│   └── src/
│       ├── main.tsx              ← клиентский entry point
│       ├── App.tsx               ← клиентский роутинг
│       ├── types/index.ts        ← ОБЩИЕ типы (оба app)
│       ├── api/                  ← ОБЩИЕ API клиенты
│       ├── utils/index.ts        ← ОБЩИЕ утилиты
│       ├── pages/                ← клиентские страницы (8 шт)
│       ├── components/           ← клиентские компоненты
│       ├── store/                ← клиентские сторы (cart, user, favorites)
│       ├── hooks/                ← хуки (useTelegram, useMainButton, useBackButton, useRepeatOrder)
│       ├── mock/data.ts          ← мок-данные для dev
│       └── admin/                ← БУДЕТ: Phase 2 (AdminApp + DeliveryApp)
│
├── backend/                      ← Источник DDL (НЕ деплоится, НЕ модифицировать api/)
│   └── db/
│       ├── schema.sql            DDL — применён к Neon
│       └── seed_ogromov.sql      реальное меню (23 блюда)
│
├── scripts/run-seed.mjs          ← выполнен
├── vercel.json
└── package.json                  root deps
```

## БД — актуальное состояние

### Категории (7 штук)
daily, business-lunch, cold-snacks, first-courses, second-courses, sides, drinks

### Меню (23 блюда с Unsplash image URLs)
- Холодные закуски (4), Первые блюда (3), Вторые блюда (7), Гарниры (5), Напитки (4)

### daily_menu — пусто (cron заполняет по будням)

## Клиентские маршруты (текущие)
```
/                    → MenuPage
/item/:id            → ItemPage
/cart                → CartPage
/checkout            → CheckoutPage
/order-success/:id   → OrderSuccessPage
/orders              → OrdersPage (+ Repeat Order)
/orders/:id          → OrderDetailPage
/profile             → ProfilePage
/talons              → TalonsPage (→ /coupons после Phase 1)
/favorites           → FavoritesPage (← в BottomNav, вкладка "Избранное")
```

## Статус задач

### ✅ Полностью выполнено
- Full frontend (8+ страниц) — меню, корзина, оформление, заказы, профиль, талоны
- Backend — 11 serverless endpoints
- DB schema на Neon (10 таблиц) + seed 23 блюда
- Deploy на Vercel + автодеплой из GitHub
- Баг-фиксы: пустое меню, oklch() цвета, CSS layers, изображения в WebView
- Feature: Favorites (избранное), Repeat Order (повтор заказа)
- Design polish (48 UI фиксов по UI Engineer Skill)
- Pull-to-refresh, ErrorState, Skeleton loading, OrderDetailPage
- Build & tsc clean

### 🔄 Phase 1 — Refactoring (УТВЕРЖДЁН, не начат)
- Талоны → Купоны (UI + API, НЕ DB)
- Кабинет → Адрес (UI + types + API aliases, НЕ DB column)
- DB миграция: role, delivering, courier_id
- OrderStatus: + delivering

### 📋 Phase 2 — Admin Panel (после Phase 1)
- admin.html entry, AdminApp.tsx, страницы управления заказами/меню
- API: api/admin/

### 📋 Phase 3 — Delivery Module (после Phase 2)
- DeliveryApp внутри admin.html (роутинг по роли)
- API: api/delivery/

### 📋 Phase 4 — Analytics (после Phase 3)
- AdminStatsPage — статистика

### 🔴 Не сделано
- Реальный `BOT_TOKEN` (после создания бота)
- Реальный `ADMIN_CHAT_ID`
- `TBANK_TERMINAL_KEY` и `TBANK_TERMINAL_PASSWORD`
- Позиции бизнес-ланча (категория есть, блюд нет)

## Критические правила разработки
1. **Цены в копейках** (integer), отображение через `formatPrice(kopecks)`
2. **oklch() не работает в TG WebView** — все цвета через hex `@theme` в index.css
3. **CSS слои обязательны** — стили ВНЕ `@layer` перебивают Tailwind utilities
4. **Изображения**: `absolute top-0 left-0 w-full h-full object-cover` (не flex)
5. **backend/ — legacy**, production использует `api/` директорию
6. **Текст серого**: `gray-900`/`gray-500`, НЕ TG CSS vars для текста
7. **CTA кнопки**: `bg-emerald-500 text-white`, НЕ TG button vars
8. **Touch targets**: минимум 44x44px
9. **Объяснения на русском**, структурированно
