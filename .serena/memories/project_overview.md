# Solovka — Telegram Mini App для корпоративной столовой "Огромнов"

Последнее обновление: **26.02.2026**

## Цель проекта
Telegram Mini App для заказа еды в корпоративной столовой "Огромнов".
Пользователи просматривают меню, оформляют заказы, покупают подписки и талоны.
Отдельное admin-приложение для сотрудников столовой — **следующий этап**.

## Tech Stack

### Frontend (Mini App)
- **React 18** + **Vite** + **TypeScript**
- **@tma.js/sdk** — Telegram Mini Apps SDK
- **Tailwind CSS v4** (`@tailwindcss/vite` plugin)
- **Zustand** — управление состоянием (persist для корзины)
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

## Vercel env vars (Production Dashboard)

| Ключ | Значение |
|------|---------|
| `DATABASE_URL` | pooled Neon connection string |
| `BOT_TOKEN` | `dev` ← заменить на реальный после создания бота |
| `ADMIN_CHAT_ID` | `0` ← заменить |
| `CRON_SECRET` | установлен |
| `APP_URL` | `https://solovka-eight.vercel.app` |

> `BOT_TOKEN=dev` → validateInitData пропускается, принимается любой initData

## Структура монорепозитория

```
solovka/
├── api/                          ← Vercel serverless (ДЕПЛОЯТСЯ ИМЕННО ЭТИ)
│   ├── lib/
│   │   ├── auth.ts               validateInitData, requireAuth
│   │   ├── bot.ts                grammy bot, notifyUser, notifyAdmin
│   │   ├── constants.ts          TALON_PACKAGES, SUBSCRIPTION_PLANS
│   │   ├── db.ts                 getDb() → NeonQueryFunction
│   │   ├── tbank.ts              generateToken, initPayment, verifyWebhookToken
│   │   ├── userHelper.ts         upsertUser()
│   │   └── utils.ts              plural()
│   ├── cron/daily-menu.ts        GET /api/cron/daily-menu
│   ├── menu.ts                   GET /api/menu → {categories, items, dailyItemIds}
│   ├── orders.ts                 GET+POST /api/orders
│   ├── payment/init.ts           POST /api/payment/init
│   ├── payment/webhook.ts        POST /api/payment/webhook
│   ├── subscriptions/buy.ts      POST /api/subscriptions/buy
│   ├── subscriptions/webhook.ts  POST /api/subscriptions/webhook
│   ├── talons/buy.ts             POST /api/talons/buy
│   ├── talons/webhook.ts         POST /api/talons/webhook
│   ├── users/me.ts               GET /api/users/me
│   └── users/me/notifications.ts PUT /api/users/me/notifications
│
├── frontend/                     ← Mini App SPA
│   └── src/api/menu.ts           ✅ ИСПРАВЛЕН: fetchMenu() → /api/menu + module cache
│
├── backend/                      ← Источник (не деплоится напрямую)
│   └── db/
│       ├── schema.sql            DDL — применён к Neon
│       ├── seed.sql              УСТАРЕЛ (placeholder данные)
│       └── seed_ogromov.sql      реальное меню Огромнов (23 блюда)
│
├── scripts/
│   └── run-seed.mjs              ✅ выполнен — залил реальное меню в Neon
│
├── package.json                  root — backend deps
├── vercel.json                   buildCommand, outputDirectory, CORS, cron
└── .env.example
```

## БД — актуальное состояние (26.02.2026)

### Категории (7 штук, применены)
| sort | slug | name |
|------|------|------|
| 0 | daily | Меню дня |
| 1 | business-lunch | Бизнес-ланч |
| 2 | cold-snacks | Холодные закуски |
| 3 | first-courses | Первые блюда |
| 4 | second-courses | Вторые блюда |
| 5 | sides | Гарниры |
| 6 | drinks | Напитки |

### Меню Огромнов (23 блюда, применены)
- **Холодные закуски (4):** Оливье с ветчиной, Греческий, Свёкла с черносливом, Винегрет
- **Первые блюда (3):** Суп овощной с курицей, Харчо, Гороховый (постное)
- **Вторые блюда (7):** Су-вид куриная, Стейк свиной, Поджарка, Фрикасе, Биточки (постное), Паста болоньезе, Шашлык
- **Гарниры (5):** Картофель по-столичному, Рис, Гречка, Спагетти с маслом, Овощи на пару
- **Напитки (4):** Морс, Морс кувшин, Сок фреш апельсиновый, Чай чайник

### Production API — протестировано
```
GET https://solovka-eight.vercel.app/api/menu
Authorization: tma <any>
→ HTTP 200, {categories: 7, items: 23, dailyItemIds: []}
```

## Статус задач

### ✅ Выполнено
- Full frontend (8 страниц)
- Backend — 11 serverless endpoints
- DB schema на Neon (10 таблиц)
- Deploy на Vercel + автодеплой из GitHub
- **ИСПРАВЛЕН баг: пустое меню на продакшне** (unified /api/menu endpoint)
- **Реальное меню Огромнов залито в Neon** (23 блюда через scripts/run-seed.mjs)
- Production API протестирован — работает
- tsc clean + build clean

### ⏳ Следующий этап — Admin App (отдельный проект)
Вопросы перед стартом:
- Auth: пароль / Telegram Login / без авторизации?
- Real-time заказы (SSE/polling) или ручной refresh?

### 🔴 Ещё не сделано
- Установить реальный `BOT_TOKEN` (после создания бота в BotFather)
- Установить реальный `ADMIN_CHAT_ID`
- Настроить webhook бота на production URL
- Установить `TBANK_TERMINAL_KEY` и `TBANK_TERMINAL_PASSWORD`
- Изображения блюд (сейчас emoji-заглушки)
- Позиции бизнес-ланча (категория есть, блюд нет)
