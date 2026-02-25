# База данных — Схема PostgreSQL (Neon)

## Полная DDL схема

```sql
-- =============================================
-- ПОЛЬЗОВАТЕЛИ
-- =============================================
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  telegram_id   BIGINT UNIQUE NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT,
  username      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);

-- =============================================
-- КАТАЛОГ / МЕНЮ
-- =============================================
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,       -- "Первые блюда", "Вторые блюда", "Супы", "Напитки", "Бизнес-ланч"
  slug        TEXT UNIQUE NOT NULL, -- "first", "second", "soups", "drinks", "business-lunch"
  sort_order  INTEGER DEFAULT 0,
  icon        TEXT                 -- emoji или URL иконки
);

CREATE TABLE menu_items (
  id                 SERIAL PRIMARY KEY,
  category_id        INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  description        TEXT,
  price_kopecks      INTEGER NOT NULL,   -- цена в копейках
  image_url          TEXT,
  available          BOOLEAN DEFAULT TRUE,
  is_business_lunch  BOOLEAN DEFAULT FALSE,  -- входит в бизнес-ланч?
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- МЕНЮ ДНЯ (ежедневная рассылка)
-- =============================================
CREATE TABLE daily_menu (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  item_id     INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  UNIQUE(date, item_id)
);

CREATE INDEX idx_daily_menu_date ON daily_menu(date);

-- =============================================
-- ЗАКАЗЫ
-- =============================================
CREATE TYPE order_status AS ENUM (
  'pending',    -- создан, ожидает оплаты
  'paid',       -- оплачен
  'preparing',  -- готовится
  'ready',      -- готов к выдаче
  'delivered',  -- доставлен
  'cancelled'   -- отменён
);

CREATE TABLE orders (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status          order_status DEFAULT 'pending',
  total_kopecks   INTEGER NOT NULL,
  delivery_room   TEXT,           -- кабинет/офис доставки
  delivery_time   TEXT,           -- желаемое время ("12:00", "13:30")
  comment         TEXT,
  paid_with       TEXT,           -- 'card' | 'talon' | 'subscription'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

CREATE TABLE order_items (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  item_id         INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  price_kopecks   INTEGER NOT NULL,   -- цена на момент заказа (snapshot)
  item_name       TEXT NOT NULL       -- название на момент заказа (snapshot)
);

-- =============================================
-- ПЛАТЕЖИ
-- =============================================
CREATE TYPE payment_status AS ENUM (
  'pending',
  'confirmed',
  'rejected',
  'refunded'
);

CREATE TABLE payments (
  id                  SERIAL PRIMARY KEY,
  order_id            INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  tbank_payment_id    TEXT,            -- PaymentId от T-Bank
  tbank_order_id      TEXT,            -- OrderId отправленный в T-Bank
  status              payment_status DEFAULT 'pending',
  amount_kopecks      INTEGER NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_tbank_payment_id ON payments(tbank_payment_id);

-- =============================================
-- ПОДПИСКИ
-- =============================================
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

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(active, expires_at);

-- =============================================
-- ТАЛОНЫ
-- =============================================
CREATE TYPE talon_type AS ENUM ('lunch', 'coffee');

CREATE TABLE talons (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type        talon_type NOT NULL,
  balance     INTEGER NOT NULL DEFAULT 0,  -- количество оставшихся талонов
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)  -- один баланс на тип на пользователя
);

CREATE TABLE talon_transactions (
  id          SERIAL PRIMARY KEY,
  talon_id    INTEGER REFERENCES talons(id) ON DELETE CASCADE,
  order_id    INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  delta       INTEGER NOT NULL,   -- +5 (покупка), -1 (списание)
  description TEXT,               -- "Покупка 5 талонов", "Заказ #123"
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Логика бизнес-процессов

### Оплата через талоны
```sql
-- Списать талон при заказе
BEGIN;
  UPDATE talons
  SET balance = balance - 1, updated_at = NOW()
  WHERE user_id = $1 AND type = 'lunch' AND balance > 0;

  -- Проверить что списание прошло
  -- (affected rows должна быть 1)

  INSERT INTO talon_transactions (talon_id, order_id, delta, description)
  VALUES ($talon_id, $order_id, -1, 'Заказ #' || $order_id);

  UPDATE orders SET status = 'paid', paid_with = 'talon' WHERE id = $order_id;
COMMIT;
```

### Покупка пачки талонов
```sql
BEGIN;
  INSERT INTO talons (user_id, type, balance)
  VALUES ($user_id, 'lunch', $quantity)
  ON CONFLICT (user_id, type)
  DO UPDATE SET balance = talons.balance + $quantity, updated_at = NOW();

  INSERT INTO talon_transactions (talon_id, order_id, delta, description)
  VALUES ($talon_id, NULL, $quantity, 'Покупка ' || $quantity || ' талонов');
COMMIT;
```

### Проверка активной подписки
```sql
SELECT * FROM subscriptions
WHERE user_id = $1
  AND active = TRUE
  AND expires_at > NOW()
  AND type IN ('lunch', 'lunch_coffee')
LIMIT 1;
```

### Меню дня
```sql
-- Установить меню на день
INSERT INTO daily_menu (date, item_id)
VALUES (CURRENT_DATE, $item_id)
ON CONFLICT (date, item_id) DO NOTHING;

-- Получить меню на сегодня
SELECT m.*, c.name as category_name
FROM daily_menu dm
JOIN menu_items m ON dm.item_id = m.id
JOIN categories c ON m.category_id = c.id
WHERE dm.date = CURRENT_DATE
ORDER BY c.sort_order;
```

---

## Seed данные (начальные категории)

```sql
INSERT INTO categories (name, slug, sort_order, icon) VALUES
  ('Бизнес-ланч', 'business-lunch', 1, '🍱'),
  ('Первые блюда', 'first-courses', 2, '🥗'),
  ('Вторые блюда', 'second-courses', 3, '🍽'),
  ('Супы', 'soups', 4, '🍲'),
  ('Напитки', 'drinks', 5, '☕');
```

---

## Индексы производительности

Все основные индексы включены в схему выше.
Дополнительно для часто используемых запросов:

```sql
-- Поиск заказов пользователя за сегодня (для лимита заказов)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Активные подписки быстрый поиск
CREATE INDEX idx_subscriptions_user_active ON subscriptions(user_id, active)
  WHERE active = TRUE;
```
