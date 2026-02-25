-- Seed menu items for Solovka
-- Run after schema.sql

INSERT INTO menu_items (category_id, name, description, price_kopecks, available, is_business_lunch)
SELECT c.id, v.name, v.description, v.price_kopecks, TRUE, v.is_bl
FROM (VALUES
  -- Бизнес-ланч (slug=business-lunch)
  ('business-lunch', 'Бизнес-ланч "Классика"',   'Борщ со сметаной, котлета по-киевски с картофельным пюре, компот', 35000, TRUE),
  ('business-lunch', 'Бизнес-ланч "Рыбный"',     'Уха по-домашнему, рыба запечённая с овощами, чай',                  38000, TRUE),
  -- Первые блюда (slug=first-courses)
  ('first-courses',  'Салат Оливье',              'Классический оливье с докторской колбасой',                         18000, FALSE),
  ('first-courses',  'Салат Цезарь',              'Романо, куриное филе, пармезан, соус цезарь',                       22000, FALSE),
  ('first-courses',  'Греческий салат',           'Помидоры, огурцы, маслины, фета, оливковое масло',                  20000, FALSE),
  -- Супы (slug=soups)
  ('soups',          'Борщ со сметаной',          'Наваристый борщ на говяжьем бульоне со сметаной',                   12000, FALSE),
  ('soups',          'Куриный суп с лапшой',      'Лёгкий куриный бульон с домашней лапшой и зеленью',                 10000, FALSE),
  ('soups',          'Крем-суп из тыквы',         'Нежный тыквенный крем-суп со сливками',                             14000, FALSE),
  -- Вторые блюда (slug=second-courses)
  ('second-courses', 'Котлета по-киевски',        'Сочная котлета с маслом, подаётся с картофельным пюре',             22000, FALSE),
  ('second-courses', 'Рыба запечённая',           'Судак запечённый с лимоном и травами, гарнир — рис',                28000, FALSE),
  ('second-courses', 'Паста Карбонара',           'Спагетти с беконом, пармезаном и соусом карбонара',                 25000, FALSE),
  ('second-courses', 'Гречка с подливой',         'Гречневая каша с мясной подливой и свежими овощами',                16000, FALSE),
  -- Напитки (slug=drinks)
  ('drinks',         'Американо',                 'Двойной эспрессо с водой, 250 мл',                                   8000, FALSE),
  ('drinks',         'Капучино',                  'Эспрессо с молочной пенкой, 250 мл',                                  9000, FALSE),
  ('drinks',         'Чай листовой',              'Чёрный / зелёный / фруктовый, 400 мл',                               6000, FALSE),
  ('drinks',         'Свежевыжатый сок',          'Апельсин / яблоко / морковь, 200 мл',                               12000, FALSE)
) AS v(slug, name, description, price_kopecks, is_bl)
JOIN categories c ON c.slug = v.slug
ON CONFLICT DO NOTHING;

-- Set today's daily menu (items from different categories)
INSERT INTO daily_menu (date, item_id)
SELECT CURRENT_DATE, m.id
FROM menu_items m
JOIN categories c ON m.category_id = c.id
WHERE c.slug IN ('business-lunch', 'first-courses', 'soups', 'second-courses', 'drinks')
  AND m.id IN (
    -- Pick first item from each category
    (SELECT id FROM menu_items WHERE category_id = (SELECT id FROM categories WHERE slug='business-lunch') LIMIT 1),
    (SELECT id FROM menu_items WHERE category_id = (SELECT id FROM categories WHERE slug='first-courses') LIMIT 1),
    (SELECT id FROM menu_items WHERE category_id = (SELECT id FROM categories WHERE slug='soups') LIMIT 1),
    (SELECT id FROM menu_items WHERE category_id = (SELECT id FROM categories WHERE slug='second-courses') LIMIT 1),
    (SELECT id FROM menu_items WHERE category_id = (SELECT id FROM categories WHERE slug='drinks') LIMIT 1)
  )
ON CONFLICT (date, item_id) DO NOTHING;
