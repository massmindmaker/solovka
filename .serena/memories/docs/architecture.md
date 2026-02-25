# Архитектура системы "Solovka"

## Общая схема

```
┌─────────────────────────────────────────────────────────┐
│                   TELEGRAM CLIENT                        │
│                                                          │
│   ┌─────────────────────────────────────────────────┐   │
│   │              MINI APP (WebView)                  │   │
│   │         React + Vite + @tma.js/sdk              │   │
│   │                                                  │   │
│   │  Pages: Menu │ Cart │ Checkout │ Orders          │   │
│   │          Subscriptions │ Talons                  │   │
│   └──────────────────┬──────────────────────────────┘   │
│                       │ HTTP (Authorization: tma ...)     │
└───────────────────────┼─────────────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │   VERCEL EDGE      │
              │  (CDN + Routing)   │
              └─────────┬──────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼───────┐
│  /api/menu   │ │ /api/orders │ │ /api/payment│
│  /api/users  │ │ /api/talons │ │   /webhook  │
│ Serverless   │ │ Serverless  │ │  Serverless │
│  Functions   │ │  Functions  │ │  Functions  │
└───────┬──────┘ └──────┬──────┘ └─────┬───────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
              ┌─────────▼──────────┐
              │   NEON PostgreSQL  │
              │   (Serverless DB)  │
              └────────────────────┘

        Параллельно:
┌─────────────────┐       ┌──────────────────┐
│  VERCEL CRON    │       │   T-BANK API     │
│  (07:00 UTC пн-пт) │    │  Эквайринг       │
│  /api/cron/menu │       │  PaymentURL      │
└────────┬────────┘       └──────────────────┘
         │
┌────────▼────────┐
│  TELEGRAM BOT   │
│  (уведомления + │
│   рассылка меню)│
└─────────────────┘
```

---

## Почему НЕ нужны Redis / Message Queue для MVP

| Компонент | Production-app | Наш MVP |
|-----------|---------------|---------|
| Очередь заказов | Redis + BullMQ | Прямая запись в PostgreSQL |
| Кэш меню | Redis (TTL 1h) | Запрос к Neon (меню обновляется редко) |
| WebSocket (статус заказа) | Socket.io + Redis Pub/Sub | Уведомления через Telegram Bot |
| Rate limiting | Redis | Vercel Edge Middleware (built-in) |
| Session storage | Redis | Stateless JWT или init data |

**Вывод:** Для столовой ~200 человек Vercel + Neon полностью достаточно.
Redis/очереди добавить позже если нагрузка вырастет.

---

## Флоу основных сценариев

### 1. Просмотр меню
```
User открывает Mini App
→ @tma.js/sdk: init() + miniApp.ready()
→ GET /api/menu (с Authorization: tma <initData>)
→ Backend: validateInitData() → SQL запрос к Neon
→ Ответ: массив блюд по категориям
→ Frontend: отрисовка MenuPage
```

### 2. Оформление заказа картой
```
User: добавляет блюда в корзину → жмёт "Оформить"
→ POST /api/orders { items, deliveryRoom, deliveryTime }
  → Backend: createOrder() в Neon
→ POST /api/payment/init { orderId, amount }
  → Backend: T-Bank /v2/Init → получает PaymentURL
  → Сохраняет payment(status=pending) в Neon
  → Возвращает { paymentUrl }
→ Frontend: openLink(paymentUrl) через @tma.js/sdk
→ User оплачивает на форме T-Bank
→ T-Bank → POST /api/payment/webhook
  → Backend: верифицировать Token
  → orders.status = 'paid'
  → Bot: sendMessage(user, "✅ Заказ принят!")
  → Bot: sendMessage(admin, "Новый заказ!")
  → Ответить: HTTP 200 "OK"
```

### 3. Оплата талоном
```
User: корзина → "Оплатить талоном"
→ POST /api/orders/pay-with-talon { orderId }
  → Backend: BEGIN TRANSACTION
    → Проверить talons.balance > 0
    → balance -= 1
    → INSERT talon_transactions
    → orders.status = 'paid'
    → COMMIT
  → Bot: sendMessage(user, "✅ Списан 1 талон. Остаток: N")
```

### 4. Ежедневная рассылка меню
```
Vercel Cron: 07:00 UTC (пн-пт)
→ GET /api/cron/daily-menu (Authorization: Bearer CRON_SECRET)
→ Backend:
  → Получить daily_menu на сегодня из Neon
  → Получить всех пользователей с notify=true
  → for user of users:
      bot.sendMessage(user.telegram_id, formatMenu(menu))
→ Response: { sent: N }
```

---

## Безопасность

### 1. Аутентификация каждого запроса
```typescript
// Каждый API endpoint проверяет initData
const auth = req.headers.authorization; // "tma <raw_init_data>"
validate(rawInitData, BOT_TOKEN);       // @tma.js/init-data-node
const user = parse(rawInitData).user;   // { id, first_name, ... }
```

### 2. Привязка пользователя
- Пользователь создаётся при первом запросе (upsert по telegram_id)
- Все операции проверяются по user_id из initData (не из тела запроса)

### 3. Webhook верификация
- T-Bank webhook подписывается Token (SHA-256)
- Cron Jobs верифицируются через CRON_SECRET header

### 4. SQL Injection
- Все запросы через template literals `@neondatabase/serverless` (параметризованы)

---

## Масштабирование (если понадобится)

1. **Кэш меню** → добавить Upstash Redis (интеграция с Vercel)
2. **Очередь уведомлений** → Upstash QStash (HTTP-очередь, нативная для Vercel)
3. **Много пользователей** → Neon автоматически масштабируется (Pay per use)
4. **Реальный статус заказа** → WebSocket через Pusher или Ably (managed)

---

## Окружение и конфигурация

### .env.example
```bash
# Telegram Bot
BOT_TOKEN=123456:ABC-DEF...
ADMIN_CHAT_ID=123456789

# Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/solovka?sslmode=require

# T-Bank Эквайринг
TBANK_TERMINAL_KEY=YourTerminalKey
TBANK_TERMINAL_PASSWORD=YourPassword

# App URLs
APP_URL=https://solovka.vercel.app
VITE_API_URL=/api

# Vercel Cron защита
CRON_SECRET=random-secret-string
```

### Фронтенд env (Vite)
```bash
# Только переменные с префиксом VITE_ доступны в браузере
VITE_API_URL=/api          # относительный путь для Vercel
VITE_APP_NAME=Столовая
```
