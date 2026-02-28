# Команды разработки — Solovka

## Система: Windows (PowerShell / cmd)

---

## Быстрый старт

```powershell
# Установить зависимости
cd frontend && npm install && cd ..

# Dev-сервер фронтенда
cd frontend && npm run dev     # → http://localhost:5173

# Full stack через Vercel Dev
npx vercel dev                 # → http://localhost:3000 (frontend + API)

# TypeScript check
cd frontend && npx tsc --noEmit

# Production build
cd frontend && npm run build
```

---

## Git workflow

```powershell
git checkout -b feature/name
git add .
git commit -m "feat: описание"
git push origin feature/name
# → auto preview deploy на Vercel
# merge в master → production deploy
```

---

## База данных (Neon)

```powershell
# Подключиться
psql $env:DATABASE_URL

# Применить миграцию
psql $env:DATABASE_URL -f backend/db/migration_001_roles.sql

# Seed
node scripts/run-seed.mjs
```

---

## Telegram Bot

```powershell
# Установить webhook
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" `
  -H "Content-Type: application/json" `
  -d "{""url"": ""https://solovka-eight.vercel.app/api/bot/webhook""}"

# Проверить webhook
curl "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
```

---

## Vercel

```powershell
vercel            # preview deploy
vercel --prod     # production deploy
vercel logs       # логи
vercel env ls     # env vars
```

---

## Тестирование Mini App локально

```powershell
# 1. Dev сервер
cd frontend && npm run dev

# 2. HTTPS туннель
npx localtunnel --port 5173
# Или: npx ngrok http 5173

# 3. Вставить URL в BotFather
# 4. Открыть через бота в Telegram
```

---

## SQL примеры

```sql
-- Добавить блюдо
INSERT INTO menu_items (category_id, name, description, price_kopecks, available)
VALUES (2, 'Котлета', 'Описание', 28000, true);

-- Меню на сегодня
INSERT INTO daily_menu (date, item_id)
VALUES (CURRENT_DATE, 1), (CURRENT_DATE, 5)
ON CONFLICT DO NOTHING;

-- Назначить роль
UPDATE users SET role = 'admin' WHERE telegram_id = 123456789;

-- Пополнить купоны
BEGIN;
  INSERT INTO talons (user_id, type, balance) VALUES ($1, 'lunch', 10)
    ON CONFLICT (user_id, type) DO UPDATE SET balance = talons.balance + 10;
COMMIT;
```
