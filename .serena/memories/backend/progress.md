# Backend — Прогресс разработки

Последнее обновление: **26.02.2026** — исправлена auth, подтверждено Playwright.

---

## Статус задач

| Задача | Статус |
|--------|--------|
| package.json + tsconfig | ✅ Done |
| lib/db.ts, lib/auth.ts, lib/bot.ts | ✅ Done |
| lib/tbank.ts, lib/userHelper.ts, lib/constants.ts, lib/utils.ts | ✅ Done |
| api/menu.ts — GET /api/menu | ✅ Done |
| api/orders.ts — GET+POST /api/orders | ✅ Done |
| api/payment/init.ts, webhook.ts | ✅ Done |
| api/talons/buy.ts, webhook.ts | ✅ Done |
| api/subscriptions/buy.ts, webhook.ts | ✅ Done |
| api/users/me.ts, me/notifications.ts | ✅ Done |
| api/cron/daily-menu.ts | ✅ Done |
| db/schema.sql — применён к Neon | ✅ Done |
| db/seed_ogromov.sql — применён к Neon | ✅ Done |
| **Fix: auth.ts trailing space + empty initData** | ✅ Done |

---

## Исправленный auth.ts (api/lib/auth.ts)

```typescript
// Правильная логика (после фикса):
const authHeader = (req.headers.authorization ?? '').trim()
if (!authHeader.startsWith('tma')) {
  return 401 'Missing Authorization header'
}
const initData = authHeader.slice(3).trim()  // убирает "tma" + пробел

if (botToken === 'dev') {
  // Пропустить ВСЮ валидацию, вернуть dev-пользователя
  const user = parseInitDataUser(initData)
  return { user: user ?? { id: 123456789, first_name: 'Dev', username: 'dev' }, initData }
}
// prod: validateInitData() + parseInitDataUser()
```

**Ключевые нюансы:**
- Vercel стрипает trailing spaces из заголовков → `"tma "` приходит как `"tma"` → проверять `startsWith('tma')` не `startsWith('tma ')`
- `BOT_TOKEN=dev` → любой initData принимается, включая пустой
- Пустой initData + dev → возвращается fallback `{ id: 123456789, first_name: 'Dev' }`

---

## Структура файлов

```
api/                              ← Vercel serverless (root)
├── lib/
│   ├── auth.ts                   ✅ ИСПРАВЛЕН: trim + dev fallback
│   ├── bot.ts                    grammy, notifyUser/Admin
│   ├── constants.ts              TALON_PACKAGES, SUBSCRIPTION_PLANS
│   ├── db.ts                     getDb() → neon(DATABASE_URL)
│   ├── tbank.ts                  generateToken, initPayment, verifyWebhookToken
│   ├── userHelper.ts             upsertUser()
│   └── utils.ts                  plural()
├── cron/daily-menu.ts            GET /api/cron/daily-menu
├── menu.ts                       GET /api/menu → {categories, items, dailyItemIds}
├── orders.ts                     GET+POST /api/orders
├── payment/init.ts               POST /api/payment/init
├── payment/webhook.ts            POST /api/payment/webhook → HTTP 200 "OK"
├── subscriptions/buy.ts
├── subscriptions/webhook.ts
├── talons/buy.ts
├── talons/webhook.ts
├── users/me.ts
└── users/me/notifications.ts
```

---

## Ключевые архитектурные решения

### Auth
- `requireAuth(req, res)` → `AuthResult | null` (пишет 401 сам)
- `BOT_TOKEN=dev` → skip все проверки, dev fallback user
- Vercel обрезает trailing spaces → проверять `startsWith('tma')` (без пробела)

### Neon SQL
- `neon(DATABASE_URL)` template tag, не создаём connection глобально
- Тип `NeonQueryFunction<false, false>`

### T-Bank
- Webhook всегда HTTP 200 "OK"
- orderId формат: `"talon-<id>"` или `"sub-<id>"` для различения типов

### Telegram Bot
- grammy, только `bot.api.sendMessage` (без polling)
- `BOT_TOKEN=dev` → no-op stub

### Vercel Cron
- `0 7 * * 1-5` = 10:00 МСК пн-пт
- Защищён Bearer CRON_SECRET
