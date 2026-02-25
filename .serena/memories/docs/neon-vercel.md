# Neon PostgreSQL + Vercel — Deployment Guide

## Neon PostgreSQL (Serverless)

Источник: https://neon.tech/docs

### Что такое Neon
- Serverless PostgreSQL — автоматически масштабируется и засыпает при простое
- Идеально для Vercel Serverless Functions (нет persistent connections)
- Бесплатный tier достаточен для MVP

### Установка драйвера

```bash
npm install @neondatabase/serverless
```

### Подключение

```typescript
// backend/db/client.ts
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
export default sql;
```

### Использование

```typescript
import sql from '../db/client';

// Простой запрос
const users = await sql`SELECT * FROM users WHERE telegram_id = ${telegramId}`;

// С параметрами (безопасно от SQL-инъекций через template literals)
const order = await sql`
  INSERT INTO orders (user_id, status, total_kopecks)
  VALUES (${userId}, 'pending', ${totalKopecks})
  RETURNING *
`;

// Транзакция
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

// Для транзакций использовать transaction helper:
import { Pool } from '@neondatabase/serverless';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO orders ...', [...]);
  await client.query('UPDATE talons SET balance = balance - 1 WHERE ...', [...]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

### Connection String формат
```
postgresql://user:password@ep-cool-darkness-a1b2c3d4.us-east-2.aws.neon.tech/dbname?sslmode=require
```

### Важные замечания
- Использовать **pooled connection** (с `-pooler` в hostname) при высокой нагрузке
- Template literals в `neon()` автоматически параметризуют запросы (защита от SQL-инъекций)
- **Не хранить** connection object глобально в serverless — создавать на каждый запрос (или использовать pool)

---

## Vercel Deployment

Источник: https://vercel.com/docs

### Структура проекта для Vercel

```
solovka/
├── frontend/          # статический сайт (React build)
├── backend/
│   └── api/           # каждый файл = serverless function
│       ├── menu.ts    → GET /api/menu
│       ├── orders.ts  → POST /api/orders
│       └── ...
└── vercel.json        # конфигурация
```

### vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/dist/**",
      "use": "@vercel/static"
    },
    {
      "src": "backend/api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/backend/api/$1" },
    { "src": "/(.*)", "dest": "/frontend/dist/$1" }
  ],
  "crons": [
    {
      "path": "/api/cron/daily-menu",
      "schedule": "0 7 * * 1-5"
    }
  ]
}
```

### Cron Jobs

- Timezone всегда **UTC** в выражениях
- `0 7 * * 1-5` = 07:00 UTC = 10:00 МСК, пн-пт
- Vercel делает GET запрос на указанный `/api/...` путь
- Доступны на всех тарифах (Hobby включительно)
- Для верификации что запрос от Vercel: заголовок `Authorization: Bearer CRON_SECRET`

```typescript
// backend/api/cron/daily-menu.ts
export default async function handler(req, res) {
  // Верифицировать что запрос от Vercel Cron
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  // Получить меню дня
  const todayMenu = await getDailyMenu();

  // Разослать всем подписанным пользователям
  const users = await getSubscribedUsers();
  for (const user of users) {
    await bot.sendMessage(user.telegram_id, formatMenuMessage(todayMenu));
  }

  res.status(200).json({ sent: users.length });
}
```

### Serverless Functions — ограничения

| Параметр | Hobby | Pro |
|---------|-------|-----|
| Timeout | 10 сек | 60 сек |
| Memory | 1024 MB | 3008 MB |
| Регионы | 1 (авто) | Выбор |

**Важно:** Нет persistent connections, WebSocket, background jobs.
→ Все долгие операции делать асинхронно через webhook/cron.

### Environment Variables на Vercel

В дашборде Vercel → Project Settings → Environment Variables:
```
BOT_TOKEN
ADMIN_CHAT_ID
DATABASE_URL
TBANK_TERMINAL_KEY
TBANK_TERMINAL_PASSWORD
APP_URL
CRON_SECRET
```

### Деплой

```bash
# Установить Vercel CLI
npm i -g vercel

# Линк к проекту (первый раз)
vercel link

# Preview deploy (из любой ветки)
vercel

# Production deploy
vercel --prod
```

### Preview URLs
- Каждый push в GitHub автоматически создаёт preview URL
- Удобно для тестирования Telegram Mini App без лишних шагов
- Формат: `https://solovka-git-branch-user.vercel.app`

---

## Рекомендуемый подход для Express + Vercel

Вместо одного Express-приложения — отдельные файлы на каждый endpoint:

```typescript
// backend/api/menu.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from '../db/client';
import { authMiddleware } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth (для защищённых роутов)
  const user = await authMiddleware(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const menu = await sql`
      SELECT m.*, c.name as category_name
      FROM menu_items m
      JOIN categories c ON m.category_id = c.id
      WHERE m.available = true
      ORDER BY c.sort_order, m.name
    `;
    return res.status(200).json(menu);
  }

  res.status(405).end('Method Not Allowed');
}
```
