# База данных — Схема PostgreSQL (Neon)

Последнее обновление: **28.02.2026**

## Текущая DDL схема (применена к Neon)

```sql
-- ПОЛЬЗОВАТЕЛИ
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  telegram_id   BIGINT UNIQUE NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT,
  username      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
-- PENDING (Phase 1): ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer';

-- КАТАЛОГ
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  icon        TEXT
);

CREATE TABLE menu_items (
  id                 SERIAL PRIMARY KEY,
  category_id        INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  description        TEXT,
  price_kopecks      INTEGER NOT NULL,
  image_url          TEXT,
  available          BOOLEAN DEFAULT TRUE,
  is_business_lunch  BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- МЕНЮ ДНЯ
CREATE TABLE daily_menu (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  item_id     INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  UNIQUE(date, item_id)
);

-- ЗАКАЗЫ
CREATE TYPE order_status AS ENUM (
  'pending', 'paid', 'preparing', 'ready', 'delivered', 'cancelled'
);
-- PENDING (Phase 1): ALTER TYPE order_status ADD VALUE 'delivering' AFTER 'ready';

CREATE TABLE orders (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status          order_status DEFAULT 'pending',
  total_kopecks   INTEGER NOT NULL,
  delivery_room   TEXT,          -- DB column stays, TypeScript: deliveryAddress
  delivery_time   TEXT,
  comment         TEXT,
  paid_with       TEXT,          -- 'card' | 'coupon' | 'subscription' (was 'talon')
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
-- PENDING (Phase 1): ALTER TABLE orders ADD COLUMN courier_id INTEGER REFERENCES users(id);

CREATE TABLE order_items (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  item_id         INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  price_kopecks   INTEGER NOT NULL,   -- snapshot
  item_name       TEXT NOT NULL        -- snapshot
);

-- ПЛАТЕЖИ
CREATE TYPE payment_status AS ENUM ('pending', 'confirmed', 'rejected', 'refunded');

CREATE TABLE payments (
  id                  SERIAL PRIMARY KEY,
  order_id            INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  tbank_payment_id    TEXT,
  tbank_order_id      TEXT,
  status              payment_status DEFAULT 'pending',
  amount_kopecks      INTEGER NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ПОДПИСКИ
CREATE TYPE subscription_type AS ENUM ('lunch', 'coffee', 'lunch_coffee');

CREATE TABLE subscriptions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type        subscription_type NOT NULL,
  active      BOOLEAN DEFAULT TRUE,
  starts_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ТАЛОНЫ (DB names stay as 'talons', mapped to 'coupons' in API layer)
CREATE TYPE talon_type AS ENUM ('lunch', 'coffee');

CREATE TABLE talons (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type        talon_type NOT NULL,
  balance     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)
);

CREATE TABLE talon_transactions (
  id          SERIAL PRIMARY KEY,
  talon_id    INTEGER REFERENCES talons(id) ON DELETE CASCADE,
  order_id    INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  delta       INTEGER NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

## Индексы (применены)

```sql
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_daily_menu_date ON daily_menu(date);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_tbank_payment_id ON payments(tbank_payment_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(active, expires_at);
```

## Миграция Phase 1 (PENDING — не применена)

Файл: `backend/db/migration_001_roles.sql`

```sql
-- 1. Роль пользователя
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer';
-- Значения: 'customer', 'admin', 'delivery'

-- 2. Новый статус заказа
ALTER TYPE order_status ADD VALUE 'delivering' AFTER 'ready';

-- 3. Курьер привязан к заказу
ALTER TABLE orders ADD COLUMN courier_id INTEGER REFERENCES users(id);

-- 4. Индекс для поиска заказов курьера
CREATE INDEX idx_orders_courier_id ON orders(courier_id);
```

## Маппинг DB → TypeScript

| DB column/table | TypeScript (после Phase 1) |
|-----------------|---------------------------|
| `talons` table | → API response field: `coupons` |
| `talon_transactions` table | → API response field: `couponTransactions` |
| `talons.type` (talon_type enum) | → TypeScript: `CouponType` |
| `orders.delivery_room` | → SQL alias: `AS "deliveryAddress"` |
| `orders.paid_with = 'talon'` | → будет: `'coupon'` |

## Бизнес-логика SQL

### Оплата купоном (талоном)
```sql
BEGIN;
  UPDATE talons SET balance = balance - 1, updated_at = NOW()
    WHERE user_id = $1 AND type = 'lunch' AND balance > 0;
  INSERT INTO talon_transactions (talon_id, order_id, delta, description)
    VALUES ($talon_id, $order_id, -1, 'Заказ #' || $order_id);
  UPDATE orders SET status = 'paid', paid_with = 'coupon' WHERE id = $order_id;
COMMIT;
```

### Покупка пачки купонов
```sql
BEGIN;
  INSERT INTO talons (user_id, type, balance) VALUES ($user_id, 'lunch', $qty)
    ON CONFLICT (user_id, type) DO UPDATE SET balance = talons.balance + $qty;
  INSERT INTO talon_transactions (talon_id, delta, description)
    SELECT id, $qty, 'Покупка ' || $qty || ' купонов'
    FROM talons WHERE user_id = $user_id AND type = 'lunch';
COMMIT;
```

### Меню дня
```sql
SELECT m.*, c.name as category_name
FROM daily_menu dm
JOIN menu_items m ON dm.item_id = m.id
JOIN categories c ON m.category_id = c.id
WHERE dm.date = CURRENT_DATE
ORDER BY c.sort_order;
```

## Данные в Neon

- 7 категорий (applied)
- 23 блюда с Unsplash image URLs (applied via seed_ogromov.sql)
- daily_menu: пусто (cron заполняет по будням)
- users: тестовые (BOT_TOKEN=dev → auto-upsert)
