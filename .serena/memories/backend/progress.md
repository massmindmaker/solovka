# Backend — Прогресс разработки

Последнее обновление: backend полностью написан, tsc --noEmit проходит без ошибок.

---

## Статус задач

| Задача | Статус |
|--------|--------|
| package.json + tsconfig.json | ✅ Done |
| Dependencies (@neondatabase/serverless, grammy, @vercel/node) | ✅ Done |
| lib/db.ts — Neon client | ✅ Done |
| lib/auth.ts — validateInitData + requireAuth | ✅ Done |
| lib/bot.ts — grammy bot + notifyUser/Admin | ✅ Done |
| lib/tbank.ts — generateToken + initPayment + verifyWebhookToken | ✅ Done |
| lib/userHelper.ts — upsertUser | ✅ Done |
| lib/constants.ts — TALON_PACKAGES, SUBSCRIPTION_PLANS | ✅ Done |
| lib/utils.ts — plural() | ✅ Done |
| api/menu/index.ts | ✅ Done |
| api/orders/index.ts | ✅ Done |
| api/payment/init.ts | ✅ Done |
| api/payment/webhook.ts | ✅ Done |
| api/talons/buy.ts | ✅ Done |
| api/talons/webhook.ts | ✅ Done |
| api/subscriptions/buy.ts | ✅ Done |
| api/subscriptions/webhook.ts | ✅ Done |
| api/users/me.ts | ✅ Done |
| api/users/me/notifications.ts | ✅ Done |
| api/cron/daily-menu.ts | ✅ Done |
| db/schema.sql | ✅ Done |
| vercel.json (root) | ✅ Done |
| .env.example | ✅ Done |
| tsc --noEmit clean | ✅ Done |

---

## Структура файлов

```
backend/
├── api/
│   ├── cron/
│   │   └── daily-menu.ts         — Vercel Cron: рассылка меню пн-пт 07:00 UTC
│   ├── menu/
│   │   └── index.ts              — GET /api/menu (категории + блюда + меню дня)
│   ├── orders/
│   │   └── index.ts              — GET /api/orders + POST /api/orders
│   ├── payment/
│   │   ├── init.ts               — POST /api/payment/init → T-Bank Init
│   │   └── webhook.ts            — POST /api/payment/webhook (T-Bank callback)
│   ├── subscriptions/
│   │   ├── buy.ts                — POST /api/subscriptions/buy → T-Bank Init
│   │   └── webhook.ts            — POST /api/subscriptions/webhook
│   ├── talons/
│   │   ├── buy.ts                — POST /api/talons/buy → T-Bank Init
│   │   └── webhook.ts            — POST /api/talons/webhook
│   └── users/
│       ├── me.ts                 — GET /api/users/me
│       └── me/
│           └── notifications.ts  — PUT /api/users/me/notifications
├── db/
│   └── schema.sql                — PostgreSQL DDL + seed categories
├── lib/
│   ├── auth.ts                   — validateInitData, requireAuth
│   ├── bot.ts                    — grammy Bot, notifyUser, notifyAdmin
│   ├── constants.ts              — TALON_PACKAGES, SUBSCRIPTION_PLANS
│   ├── db.ts                     — getDb() → NeonQueryFunction
│   ├── tbank.ts                  — generateToken, initPayment, verifyWebhookToken
│   ├── userHelper.ts             — upsertUser()
│   └── utils.ts                  — plural()
├── node_modules/
├── package.json
└── tsconfig.json
```

---

## Ключевые архитектурные решения

### Аутентификация
- Каждый запрос проверяет `Authorization: tma <initData>` header
- `requireAuth()` возвращает `{ user: TelegramUser, initData }` или null (и сам пишет 401)
- В dev режиме (BOT_TOKEN=dev) валидация пропускается

### Neon SQL
- Используется `neon(DATABASE_URL)` template tag
- Тип `NeonQueryFunction<false, false>` — конкретный, без generic boolean
- НЕ создаём connection на уровне модуля (serverless limitation)

### T-Bank платежи
- `lib/tbank.ts` — generateToken (SHA-256), initPayment, verifyWebhookToken
- Webhook ВСЕГДА возвращает HTTP 200 "OK", даже при ошибке
- Для талонов и подписок — отдельные webhook эндпоинты (/talons/webhook, /subscriptions/webhook)
- Для идентификации покупки в webhook: orderId в формате "talon-<id>" или "sub-<id>", comment в заказе хранит метаданные

### Telegram Bot
- grammy (современная замена node-telegram-bot-api — без уязвимостей)
- Используется только API (`bot.api.sendMessage`) без polling/webhook
- `getBot()` создаёт синглтон; в dev (BOT_TOKEN=dev) возвращает no-op stub

### Vercel Cron
- `0 7 * * 1-5` = 07:00 UTC пн-пт = 10:00 MSK
- Защищён Bearer CRON_SECRET токеном
- 50ms delay между сообщениями для избежания rate limits Telegram

---

## Переменные окружения (Vercel Dashboard)

| Ключ | Описание |
|------|---------|
| `BOT_TOKEN` | Telegram Bot токен от @BotFather |
| `ADMIN_CHAT_ID` | Telegram ID администратора |
| `DATABASE_URL` | Neon pooled connection string |
| `TBANK_TERMINAL_KEY` | Ключ терминала T-Bank |
| `TBANK_TERMINAL_PASSWORD` | Пароль терминала T-Bank |
| `APP_URL` | Production URL (https://solovka.vercel.app) |
| `CRON_SECRET` | Секрет для Vercel Cron |

---

## Деплой

1. Создать проект на Vercel, подключить GitHub
2. Создать базу данных на Neon, получить `DATABASE_URL` (pooled)
3. Применить схему: скопировать `backend/db/schema.sql` в Neon SQL Editor
4. Добавить все env-переменные в Vercel Dashboard
5. Зарегистрировать бота через @BotFather, настроить Mini App URL
6. Деплой через `git push` → Vercel автоматически собирает
