# Команды разработки — Solovka

## Система: Windows (PowerShell / cmd)

---

## Первоначальная настройка

```powershell
# Клонировать и установить зависимости
git clone <repo>
cd solovka

# Установить зависимости фронтенда
cd frontend && npm install && cd ..

# Установить зависимости бэкенда
cd backend && npm install && cd ..

# Скопировать env
copy .env.example .env
# Заполнить .env значениями
```

---

## Разработка

### Frontend (React + Vite)
```powershell
cd frontend

# Запуск dev-сервера
npm run dev
# → http://localhost:5173

# Сборка продакшн
npm run build

# Превью продакшн сборки
npm run preview

# Линтинг
npm run lint

# Тайп-чек
npm run typecheck
```

### Backend (Vercel Functions локально)
```powershell
cd backend

# Запуск через Vercel Dev (эмулирует serverless)
npx vercel dev
# → http://localhost:3000

# Или через ts-node для быстрой проверки
npx ts-node api/menu.ts
```

### Полный проект через Vercel Dev
```powershell
# В корне репозитория
npx vercel dev
# → Frontend: http://localhost:3000
# → API: http://localhost:3000/api/*
```

---

## База данных (Neon)

```powershell
# Применить схему (через psql)
# Установить psql: https://www.postgresql.org/download/windows/
psql $DATABASE_URL -f backend/db/schema.sql

# Или через Node скрипт
cd backend
npx ts-node db/migrate.ts

# Seed начальными данными
npx ts-node db/seed.ts

# Подключиться к БД напрямую
psql $env:DATABASE_URL
```

---

## Telegram Bot

```powershell
# Настройка webhook (в продакшне — через Vercel URL)
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" `
  -H "Content-Type: application/json" `
  -d "{""url"": ""https://solovka.vercel.app/api/bot/webhook""}"

# Проверить статус webhook
curl "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"

# Удалить webhook (для локальной разработки с polling)
curl "https://api.telegram.org/bot$BOT_TOKEN/deleteWebhook"
```

---

## Тестирование Mini App локально

```powershell
# 1. Запустить dev-сервер фронтенда
cd frontend && npm run dev

# 2. Создать HTTPS туннель (нужен для Telegram)
npx localtunnel --port 5173
# Или: npx ngrok http 5173

# 3. Скопировать https:// URL

# 4. В BotFather: /newapp или /editapp → вставить URL

# 5. Открыть Mini App через бота в Telegram
```

---

## Деплой на Vercel

```powershell
# Установить Vercel CLI
npm i -g vercel

# Первый раз — залинковать проект
vercel link

# Preview deploy (тестовый)
vercel

# Production deploy
vercel --prod

# Посмотреть логи
vercel logs

# Посмотреть env переменные
vercel env ls
```

---

## Git workflow

```powershell
# Создать feature-ветку
git checkout -b feature/menu-page

# Коммит
git add .
git commit -m "feat: add menu page with categories"

# Push и автоматический preview deploy
git push origin feature/menu-page

# Мёрдж в main → production deploy
git checkout main
git merge feature/menu-page
git push origin main
```

---

## Типичные задачи

### Добавить новое блюдо в БД
```sql
INSERT INTO menu_items (category_id, name, description, price_kopecks, available)
VALUES (2, 'Котлета по-киевски', 'С картофельным пюре', 28000, true);
```

### Установить меню на сегодня
```sql
INSERT INTO daily_menu (date, item_id)
VALUES (CURRENT_DATE, 1), (CURRENT_DATE, 5), (CURRENT_DATE, 12)
ON CONFLICT DO NOTHING;
```

### Пополнить баланс талонов пользователю
```sql
BEGIN;
  INSERT INTO talons (user_id, type, balance)
  VALUES ($user_id, 'lunch', 10)
  ON CONFLICT (user_id, type)
  DO UPDATE SET balance = talons.balance + 10;
  INSERT INTO talon_transactions (talon_id, delta, description)
  SELECT id, 10, 'Ручное пополнение'
  FROM talons WHERE user_id = $user_id AND type = 'lunch';
COMMIT;
```

---

## Полезные утилиты Windows

```powershell
# Найти файл
Get-ChildItem -Recurse -Filter "*.ts" | Select-String "pattern"

# Установить переменную окружения для сессии
$env:DATABASE_URL = "postgresql://..."

# Посмотреть переменные окружения
Get-ChildItem Env:

# Запустить скрипт с env из .env файла
# Установить: npm i -g dotenv-cli
dotenv -- npx ts-node script.ts
```
