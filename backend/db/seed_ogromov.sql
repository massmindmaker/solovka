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
DELETE FROM categories WHERE slug = 'soups'
  AND NOT EXISTS (SELECT 1 FROM menu_items WHERE category_id = (SELECT id FROM categories WHERE slug='soups'));

-- 2. Очищаем старые данные меню и daily_menu
TRUNCATE TABLE daily_menu;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders CASCADE;
DELETE FROM menu_items;

-- Сбрасываем счётчики id (опционально, для чистоты)
ALTER SEQUENCE menu_items_id_seq RESTART WITH 1;

-- 3. Сидим реальное меню Огромнов (теперь с image_url!)
INSERT INTO menu_items (category_id, name, description, price_kopecks, image_url, available, is_business_lunch)
SELECT c.id, v.name, v.description, v.price_kopecks, v.image_url, TRUE, FALSE
FROM (VALUES

  -- ── Холодные закуски ──────────────────────────────────
  ('cold-snacks', 'Салат ОЛИВЬЕ ПО-ДОМАШНЕМУ с ветчиной',
   '120 гр', 12000,
   'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=400&h=300&fit=crop'),

  ('cold-snacks', 'Салат ГРЕЧЕСКИЙ',
   '120 гр', 25000,
   'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop'),

  ('cold-snacks', 'Салат из свёклы с черносливом и майонезом',
   '120 гр', 12000,
   'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400&h=300&fit=crop'),

  ('cold-snacks', 'Винегрет овощной',
   '120 гр', 12000,
   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'),

  -- ── Первые блюда (супы) ───────────────────────────────
  ('first-courses', 'Суп из ОВОЩЕЙ с курицей и сметаной',
   '300 гр', 35000,
   'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop'),

  ('first-courses', 'СУП-ХАРЧО с говядиной',
   '300 гр', 45000,
   'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=400&h=300&fit=crop'),

  ('first-courses', 'Суп гороховый с картофелем на овощном бульоне',
   '300 гр. ПОСТНОЕ', 25000,
   'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400&h=300&fit=crop'),

  -- ── Вторые блюда ──────────────────────────────────────
  ('second-courses', 'Грудка куриная СУ-ВИД',
   '100 гр', 25000,
   'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&h=300&fit=crop'),

  ('second-courses', 'СТЕЙК из свиной корейки',
   '100 гр', 28500,
   'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop'),

  ('second-courses', 'Поджарка из свинины',
   '100/50 гр', 27500,
   'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'),

  ('second-courses', 'ФРИКАСЕ из куриной грудки',
   '200 гр', 35000,
   'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=300&fit=crop'),

  ('second-courses', 'Биточки картофельные, соус грибной',
   '150/50 гр. ПОСТНОЕ', 15000,
   'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=400&h=300&fit=crop'),

  ('second-courses', 'Паста с соусом Болоньезе',
   '300 гр', 27500,
   'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop'),

  ('second-courses', 'Шашлык из свиной шейки',
   '100 гр', 25000,
   'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop'),

  -- ── Гарниры ───────────────────────────────────────────
  ('sides', 'Картофель ПО-СТОЛИЧНОМУ',
   '150 гр', 15000,
   'https://images.unsplash.com/photo-1568569350062-ebfa3cb195df?w=400&h=300&fit=crop'),

  ('sides', 'Рис отварной',
   '150 гр', 12500,
   'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400&h=300&fit=crop'),

  ('sides', 'Гречка отварная',
   '150 гр', 10000,
   'https://images.unsplash.com/photo-1595908129746-57ca1a63dd4d?w=400&h=300&fit=crop'),

  ('sides', 'Спагетти с маслом',
   '150 гр', 10000,
   'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&h=300&fit=crop'),

  ('sides', 'ОВОЩИ НА ПАРУ',
   '150 гр', 19500,
   'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop&q=80'),

  -- ── Напитки ───────────────────────────────────────────
  ('drinks', 'МОРС',
   '320 мл', 8500,
   'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400&h=300&fit=crop'),

  ('drinks', 'МОРС КУВШИН',
   '1 литр', 25000,
   'https://images.unsplash.com/photo-1560508179-b2c9a3f8e92b?w=400&h=300&fit=crop'),

  ('drinks', 'Сок ФРЕШ Апельсиновый',
   '200 мл', 15000,
   'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop'),

  ('drinks', 'Чай ЧАЙНИК',
   'Заварочный чайник', 15000,
   'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop')

) AS v(slug, name, description, price_kopecks, image_url)
JOIN categories c ON c.slug = v.slug;

-- 4. Добавляем запись для "Меню дня" (пример — сегодня вручную)
-- В проде это делает /api/cron/daily-menu автоматически
-- Здесь оставляем пустым; при первом запросе cron заполнит
