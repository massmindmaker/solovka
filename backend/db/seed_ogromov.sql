-- =============================================
-- Seed: реальное меню "Огромнов" 25.02.2026
-- Запускать ПОСЛЕ schema.sql
-- Полностью заменяет старые placeholder-данные
-- =============================================

-- 1. Добавляем недостающие категории
INSERT INTO categories (name, slug, sort_order, icon) VALUES
  ('Холодные закуски', 'cold-snacks', 2, '🥗'),
  ('Первые блюда',     'first-courses', 3, '🍲'),
  ('Вторые блюда',     'second-courses', 4, '🍽'),
  ('Гарниры',          'sides', 5, '🍚'),
  ('Напитки',          'drinks', 6, '🥤')
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      sort_order = EXCLUDED.sort_order,
      icon = EXCLUDED.icon;

-- Обновляем "Меню дня" sort_order на 0, "Бизнес-ланч" на 1
UPDATE categories SET sort_order = 0 WHERE slug = 'daily';
UPDATE categories SET sort_order = 1 WHERE slug = 'business-lunch';

-- Убираем дублирующую категорию "Супы" (first-courses теперь включает супы)
-- Блюда из soups будем класть в first-courses
-- Удалить можно только если нет зависимых menu_items
DELETE FROM categories WHERE slug = 'soups'
  AND NOT EXISTS (SELECT 1 FROM menu_items WHERE category_id = (SELECT id FROM categories WHERE slug='soups'));

-- 2. Очищаем старые данные меню и daily_menu
TRUNCATE TABLE daily_menu;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders CASCADE;
DELETE FROM menu_items;

-- Сбрасываем счётчики id (опционально, для чистоты)
ALTER SEQUENCE menu_items_id_seq RESTART WITH 1;

-- 3. Сидим реальное меню Огромнов
INSERT INTO menu_items (category_id, name, description, price_kopecks, available, is_business_lunch)
SELECT c.id, v.name, v.description, v.price_kopecks, TRUE, FALSE
FROM (VALUES

  -- ── Холодные закуски ──────────────────────────────────
  ('cold-snacks', 'Салат ОЛИВЬЕ ПО-ДОМАШНЕМУ с ветчиной',
   '120 гр', 12000),

  ('cold-snacks', 'Салат ГРЕЧЕСКИЙ',
   '120 гр', 25000),

  ('cold-snacks', 'Салат из свёклы с черносливом и майонезом',
   '120 гр', 12000),

  ('cold-snacks', 'Винегрет овощной',
   '120 гр', 12000),

  -- ── Первые блюда (супы) ───────────────────────────────
  ('first-courses', 'Суп из ОВОЩЕЙ с курицей и сметаной',
   '300 гр', 35000),

  ('first-courses', 'СУП-ХАРЧО с говядиной',
   '300 гр', 45000),

  ('first-courses', 'Суп гороховый с картофелем на овощном бульоне',
   '300 гр. ПОСТНОЕ', 25000),

  -- ── Вторые блюда ──────────────────────────────────────
  ('second-courses', 'Грудка куриная СУ-ВИД',
   '100 гр', 25000),

  ('second-courses', 'СТЕЙК из свиной корейки',
   '100 гр', 28500),

  ('second-courses', 'Поджарка из свинины',
   '100/50 гр', 27500),

  ('second-courses', 'ФРИКАСЕ из куриной грудки',
   '200 гр', 35000),

  ('second-courses', 'Биточки картофельные, соус грибной',
   '150/50 гр. ПОСТНОЕ', 15000),

  ('second-courses', 'Паста с соусом Болоньезе',
   '300 гр', 27500),

  ('second-courses', 'Шашлык из свиной шейки',
   '100 гр', 25000),

  -- ── Гарниры ───────────────────────────────────────────
  ('sides', 'Картофель ПО-СТОЛИЧНОМУ',
   '150 гр', 15000),

  ('sides', 'Рис отварной',
   '150 гр', 12500),

  ('sides', 'Гречка отварная',
   '150 гр', 10000),

  ('sides', 'Спагетти с маслом',
   '150 гр', 10000),

  ('sides', 'ОВОЩИ НА ПАРУ',
   '150 гр', 19500),

  -- ── Напитки ───────────────────────────────────────────
  ('drinks', 'МОРС',
   '320 мл', 8500),

  ('drinks', 'МОРС КУВШИН',
   '1 литр', 25000),

  ('drinks', 'Сок ФРЕШ Апельсиновый',
   '200 мл', 15000),

  ('drinks', 'Чай ЧАЙНИК',
   'Заварочный чайник', 15000)

) AS v(slug, name, description, price_kopecks)
JOIN categories c ON c.slug = v.slug;

-- 4. Добавляем запись для "Меню дня" (пример — сегодня вручную)
-- В проде это делает /api/cron/daily-menu автоматически
-- Здесь оставляем пустым; при первом запросе cron заполнит
