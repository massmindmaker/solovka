-- =============================================
-- Solovka — PostgreSQL Schema (Neon)
-- Run once against your Neon database
-- =============================================

-- ── Users ────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  telegram_id       BIGINT UNIQUE NOT NULL,
  first_name        TEXT NOT NULL,
  last_name         TEXT,
  username          TEXT,
  notify_daily_menu BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- ── Categories ───────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  icon        TEXT
);

-- ── Menu Items ───────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id                SERIAL PRIMARY KEY,
  category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  price_kopecks     INTEGER NOT NULL,
  image_url         TEXT,
  available         BOOLEAN DEFAULT TRUE,
  is_business_lunch BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Daily Menu ───────────────────────────────
CREATE TABLE IF NOT EXISTS daily_menu (
  id      SERIAL PRIMARY KEY,
  date    DATE NOT NULL,
  item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  UNIQUE(date, item_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_menu_date ON daily_menu(date);

-- ── Orders ───────────────────────────────────
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending', 'paid', 'preparing', 'ready', 'delivered', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS orders (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status          order_status DEFAULT 'pending',
  total_kopecks   INTEGER NOT NULL,
  delivery_room   TEXT,
  delivery_time   TEXT,
  comment         TEXT,
  paid_with       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  item_id         INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  price_kopecks   INTEGER NOT NULL,
  item_name       TEXT NOT NULL
);

-- ── Payments ─────────────────────────────────
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending', 'confirmed', 'rejected', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payments (
  id                SERIAL PRIMARY KEY,
  order_id          INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  tbank_payment_id  TEXT,
  tbank_order_id    TEXT,
  status            payment_status DEFAULT 'pending',
  amount_kopecks    INTEGER NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id         ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_tbank_payment_id ON payments(tbank_payment_id);

-- ── Subscriptions ────────────────────────────
DO $$ BEGIN
  CREATE TYPE subscription_type AS ENUM ('lunch', 'coffee', 'lunch_coffee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS subscriptions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type        subscription_type NOT NULL,
  active      BOOLEAN DEFAULT TRUE,
  starts_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active  ON subscriptions(active, expires_at);

-- ── Talons ───────────────────────────────────
DO $$ BEGIN
  CREATE TYPE talon_type AS ENUM ('lunch', 'coffee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS talons (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type        talon_type NOT NULL,
  balance     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)
);

CREATE TABLE IF NOT EXISTS talon_transactions (
  id          SERIAL PRIMARY KEY,
  talon_id    INTEGER REFERENCES talons(id) ON DELETE CASCADE,
  order_id    INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  delta       INTEGER NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed: Categories ─────────────────────────
INSERT INTO categories (name, slug, sort_order, icon) VALUES
  ('Меню дня',       'daily',           0, '⭐'),
  ('Бизнес-ланч',    'business-lunch',  1, '🍱'),
  ('Первые блюда',   'first-courses',   2, '🥗'),
  ('Вторые блюда',   'second-courses',  3, '🍽'),
  ('Супы',           'soups',           4, '🍲'),
  ('Напитки',        'drinks',          5, '☕')
ON CONFLICT (slug) DO NOTHING;
