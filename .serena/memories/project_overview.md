# Solovka — Telegram Mini App для доставки еды из столовой

## Цель проекта
Веб-приложение (Telegram Mini App) для заказа еды из корпоративной столовой.
Пользователи могут просматривать меню, оформлять заказы, покупать подписки и талоны.

## Основной функционал (MVP)
1. **Меню по категориям** — первые, вторые блюда, супы, напитки
2. **Бизнес-ланч** — комплексный обед, отдельная категория
3. **Корзина** — добавление/удаление, просмотр итога
4. **Оформление заказа** — адрес/кабинет, время доставки
5. **Оплата** — через T-Bank эквайринг (редирект на форму банка)
6. **Подписки** — на бизнес-ланч и/или кофе (ежемесячные)
7. **Талоны** — покупка пакетов (5/10/20 шт.), списание при заказе ланча
8. **Ежедневная рассылка меню** — бот шлёт меню дня каждый будний день
9. **Уведомления** — подтверждение заказа, статус оплаты через Telegram Bot
10. **Администратор** — уведомление о новом заказе

## Tech Stack

### Frontend
- **React 18** + **Vite** + **TypeScript**
- **@tma.js/sdk** — Telegram Mini Apps SDK
- **Tailwind CSS** — стилизация
- **Zustand** — управление состоянием (корзина, пользователь)
- **React Router v6** — навигация

### Backend
- **Node.js** + **Express** + **TypeScript**
- Деплой как **Vercel Serverless Functions**
- **@neondatabase/serverless** — драйвер для Neon PostgreSQL
- **node-telegram-bot-api** — Telegram Bot для уведомлений

### Инфраструктура
- **Vercel** — хостинг фронтенда и бэкенда (serverless)
- **Neon** — PostgreSQL serverless база данных
- **T-Bank эквайринг** — приём платежей картой
- **Vercel Cron Jobs** — ежедневная рассылка меню (07:00 UTC = 10:00 МСК)

## Структура монорепозитория
```
solovka/
├── frontend/                   # React SPA (Telegram Mini App)
│   ├── src/
│   │   ├── pages/              # Страницы приложения
│   │   ├── components/         # Переиспользуемые компоненты
│   │   ├── store/              # Zustand stores
│   │   ├── api/                # API-клиент (fetch-обёртки)
│   │   ├── hooks/              # Кастомные хуки
│   │   └── types/              # TypeScript типы
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── backend/                    # Express API → Vercel Functions
│   ├── api/                    # Vercel serverless endpoints
│   │   ├── menu.ts
│   │   ├── orders.ts
│   │   ├── users.ts
│   │   ├── subscriptions.ts
│   │   ├── talons.ts
│   │   ├── payment/
│   │   │   ├── init.ts         # Инициация платежа T-Bank
│   │   │   └── webhook.ts      # Webhook от T-Bank
│   │   └── cron/
│   │       └── daily-menu.ts   # Рассылка меню дня
│   ├── db/
│   │   ├── schema.sql          # DDL таблиц
│   │   ├── client.ts           # Neon DB client
│   │   └── queries/            # SQL-запросы по доменам
│   ├── lib/
│   │   ├── auth.ts             # Валидация TMA init data
│   │   ├── tbank.ts            # T-Bank API клиент
│   │   └── bot.ts              # Telegram Bot клиент
│   └── package.json
├── vercel.json                 # Cron jobs + routing
├── .env.example
└── package.json                # Workspace root
```

## Окружение (.env переменные)
```
# Telegram
BOT_TOKEN=               # от BotFather
ADMIN_CHAT_ID=           # куда слать уведомления администратору

# Neon PostgreSQL
DATABASE_URL=            # postgresql://...@ep-xxx.neon.tech/dbname?sslmode=require

# T-Bank
TBANK_TERMINAL_KEY=      # от Т-Бизнеса
TBANK_TERMINAL_PASSWORD= # пароль терминала (для Token)

# App
NEXT_PUBLIC_API_URL=     # URL бэкенда (или /api для Vercel)
APP_URL=                 # URL фронтенда (для CORS и редиректов)
```
