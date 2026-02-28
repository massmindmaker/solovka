# Backend API — Прогресс разработки

Последнее обновление: **28.02.2026**
Статус: **ВСЕ 4 ФАЗЫ ЗАВЕРШЕНЫ**

## ВАЖНО: Два каталога
- `api/` — **PRODUCTION** (Vercel serverless)
- `backend/` — **LEGACY** (DDL only)

---

## API Endpoints — все реализованы

| Endpoint | Метод | Статус |
|----------|-------|--------|
| `api/menu.ts` | GET | ✅ |
| `api/orders/index.ts` | GET+POST | ✅ |
| `api/orders/[id].ts` | GET | ✅ |
| `api/payment/init.ts` | POST | ✅ |
| `api/payment/webhook.ts` | POST | ✅ |
| `api/coupons/buy.ts` | POST | ✅ |
| `api/coupons/webhook.ts` | POST | ✅ |
| `api/subscriptions/buy.ts` | POST | ✅ |
| `api/subscriptions/webhook.ts` | POST | ✅ |
| `api/users/me.ts` | GET | ✅ (includes role) |
| `api/users/me/notifications.ts` | PUT | ✅ |
| `api/cron/daily-menu.ts` | GET | ✅ |
| `api/admin/orders.ts` | GET+PUT | ✅ Phase 2 |
| `api/admin/menu.ts` | GET/POST/PUT/DELETE | ✅ Phase 2 |
| `api/admin/daily-menu.ts` | GET+PUT | ✅ Phase 2 |
| `api/admin/stats.ts` | GET | ✅ Phase 4 |
| `api/delivery/orders.ts` | GET | ✅ Phase 3 |
| `api/delivery/pickup.ts` | PUT | ✅ Phase 3 |
| `api/delivery/complete.ts` | PUT | ✅ Phase 3 |
| `api/delivery/history.ts` | GET | ✅ Phase 3 |

## Lib модули

| Файл | Описание | Статус |
|------|----------|--------|
| `api/lib/auth.ts` | validateInitData, requireAuth | ✅ |
| `api/lib/adminAuth.ts` | requireRole, requireAdmin | ✅ Phase 2 |
| `api/lib/bot.ts` | grammy, notifyUser, notifyAdmin, formatOrderNotification | ✅ |
| `api/lib/constants.ts` | COUPON_PACKAGES, SUBSCRIPTION_PLANS | ✅ |
| `api/lib/db.ts` | getDb() → neon | ✅ |
| `api/lib/tbank.ts` | T-Bank payment | ✅ |
| `api/lib/userHelper.ts` | upsertUser | ✅ |
| `api/lib/utils.ts` | plural() | ✅ |
