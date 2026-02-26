// One-time script: apply seed_ogromov.sql to Neon DB
// Run: DATABASE_URL=... node scripts/run-seed.mjs

import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function run() {
  console.log('Connecting to Neon...')

  // Step 1: Upsert categories
  console.log('\n[1/5] Upserting categories...')
  await sql`
    INSERT INTO categories (name, slug, sort_order, icon) VALUES
      ('Холодные закуски', 'cold-snacks',    2, '🥗'),
      ('Первые блюда',     'first-courses',  3, '🍲'),
      ('Вторые блюда',     'second-courses', 4, '🍽'),
      ('Гарниры',          'sides',          5, '🍚'),
      ('Напитки',          'drinks',         6, '🥤')
    ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name,
          sort_order = EXCLUDED.sort_order,
          icon = EXCLUDED.icon
  `

  await sql`UPDATE categories SET sort_order = 0 WHERE slug = 'daily'`
  await sql`UPDATE categories SET sort_order = 1 WHERE slug = 'business-lunch'`
  console.log('  ✓ Categories updated')

  // Step 2: Delete soups category if empty
  console.log('\n[2/5] Removing legacy "soups" category if empty...')
  await sql`
    DELETE FROM categories WHERE slug = 'soups'
      AND NOT EXISTS (
        SELECT 1 FROM menu_items
        WHERE category_id = (SELECT id FROM categories WHERE slug='soups')
      )
  `
  console.log('  ✓ Done')

  // Step 3: Truncate old data
  console.log('\n[3/5] Clearing old menu data...')
  await sql`TRUNCATE TABLE daily_menu`
  await sql`TRUNCATE TABLE order_items`
  await sql`TRUNCATE TABLE orders CASCADE`
  await sql`DELETE FROM menu_items`
  await sql`ALTER SEQUENCE menu_items_id_seq RESTART WITH 1`
  console.log('  ✓ Cleared')

  // Step 4: Insert real Огромнов menu (with image_url!)
  console.log('\n[4/5] Inserting real Огромнов menu (23 items with photos)...')
  const items = [
    // Холодные закуски
    { slug: 'cold-snacks', name: 'Салат ОЛИВЬЕ ПО-ДОМАШНЕМУ с ветчиной',     desc: '120 гр',               price: 12000, img: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=400&h=300&fit=crop' },
    { slug: 'cold-snacks', name: 'Салат ГРЕЧЕСКИЙ',                           desc: '120 гр',               price: 25000, img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop' },
    { slug: 'cold-snacks', name: 'Салат из свёклы с черносливом и майонезом',  desc: '120 гр',               price: 12000, img: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400&h=300&fit=crop' },
    { slug: 'cold-snacks', name: 'Винегрет овощной',                          desc: '120 гр',               price: 12000, img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop' },
    // Первые блюда (супы)
    { slug: 'first-courses', name: 'Суп из ОВОЩЕЙ с курицей и сметаной',              desc: '300 гр',              price: 35000, img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop' },
    { slug: 'first-courses', name: 'СУП-ХАРЧО с говядиной',                           desc: '300 гр',              price: 45000, img: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=400&h=300&fit=crop' },
    { slug: 'first-courses', name: 'Суп гороховый с картофелем на овощном бульоне',   desc: '300 гр. ПОСТНОЕ',     price: 25000, img: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400&h=300&fit=crop' },
    // Вторые блюда
    { slug: 'second-courses', name: 'Грудка куриная СУ-ВИД',                  desc: '100 гр',              price: 25000, img: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&h=300&fit=crop' },
    { slug: 'second-courses', name: 'СТЕЙК из свиной корейки',                desc: '100 гр',              price: 28500, img: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop' },
    { slug: 'second-courses', name: 'Поджарка из свинины',                    desc: '100/50 гр',           price: 27500, img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop' },
    { slug: 'second-courses', name: 'ФРИКАСЕ из куриной грудки',              desc: '200 гр',              price: 35000, img: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=300&fit=crop' },
    { slug: 'second-courses', name: 'Биточки картофельные, соус грибной',     desc: '150/50 гр. ПОСТНОЕ',  price: 15000, img: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=400&h=300&fit=crop' },
    { slug: 'second-courses', name: 'Паста с соусом Болоньезе',               desc: '300 гр',              price: 27500, img: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop' },
    { slug: 'second-courses', name: 'Шашлык из свиной шейки',                 desc: '100 гр',              price: 25000, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop' },
    // Гарниры
    { slug: 'sides', name: 'Картофель ПО-СТОЛИЧНОМУ', desc: '150 гр', price: 15000, img: 'https://images.unsplash.com/photo-1568569350062-ebfa3cb195df?w=400&h=300&fit=crop' },
    { slug: 'sides', name: 'Рис отварной',             desc: '150 гр', price: 12500, img: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400&h=300&fit=crop' },
    { slug: 'sides', name: 'Гречка отварная',           desc: '150 гр', price: 10000, img: 'https://images.unsplash.com/photo-1595908129746-57ca1a63dd4d?w=400&h=300&fit=crop' },
    { slug: 'sides', name: 'Спагетти с маслом',         desc: '150 гр', price: 10000, img: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&h=300&fit=crop' },
    { slug: 'sides', name: 'ОВОЩИ НА ПАРУ',             desc: '150 гр', price: 19500, img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop&q=80' },
    // Напитки
    { slug: 'drinks', name: 'МОРС',                      desc: '320 мл',            price:  8500, img: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400&h=300&fit=crop' },
    { slug: 'drinks', name: 'МОРС КУВШИН',               desc: '1 литр',            price: 25000, img: 'https://images.unsplash.com/photo-1560508179-b2c9a3f8e92b?w=400&h=300&fit=crop' },
    { slug: 'drinks', name: 'Сок ФРЕШ Апельсиновый',     desc: '200 мл',            price: 15000, img: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop' },
    { slug: 'drinks', name: 'Чай ЧАЙНИК',                 desc: 'Заварочный чайник', price: 15000, img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop' },
  ]

  for (const item of items) {
    await sql`
      INSERT INTO menu_items (category_id, name, description, price_kopecks, image_url, available, is_business_lunch)
      SELECT c.id, ${item.name}, ${item.desc}, ${item.price}, ${item.img}, TRUE, FALSE
      FROM categories c WHERE c.slug = ${item.slug}
    `
    process.stdout.write('.')
  }
  console.log(`\n  ✓ Inserted ${items.length} items`)

  // Step 5: Verify
  console.log('\n[5/5] Verification...')
  const cats = await sql`SELECT slug, name, sort_order FROM categories ORDER BY sort_order`
  const count = await sql`SELECT COUNT(*) AS total FROM menu_items`
  const withImg = await sql`SELECT COUNT(*) AS total FROM menu_items WHERE image_url IS NOT NULL`

  console.log('\nCategories:')
  for (const c of cats) console.log(`  ${c.sort_order}. [${c.slug}] ${c.name}`)
  console.log(`\nTotal menu items: ${count[0].total}`)
  console.log(`Items with images: ${withImg[0].total}`)
  console.log('\n✅ Seed complete!')
}

run().catch((err) => {
  console.error('\n❌ Seed failed:', err.message)
  process.exit(1)
})
