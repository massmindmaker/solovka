// One-time script: apply seed_ogromov.sql to Neon DB
// Run: node scripts/run-seed.mjs

import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

  // Step 4: Insert real Огромнов menu
  console.log('\n[4/5] Inserting real Огромнов menu (23 items)...')
  const items = [
    // Холодные закуски
    { slug: 'cold-snacks', name: 'Салат ОЛИВЬЕ ПО-ДОМАШНЕМУ с ветчиной',    desc: '120 гр',               price: 12000 },
    { slug: 'cold-snacks', name: 'Салат ГРЕЧЕСКИЙ',                          desc: '120 гр',               price: 25000 },
    { slug: 'cold-snacks', name: 'Салат из свёклы с черносливом и майонезом',desc: '120 гр',               price: 12000 },
    { slug: 'cold-snacks', name: 'Винегрет овощной',                         desc: '120 гр',               price: 12000 },
    // Первые блюда (супы)
    { slug: 'first-courses', name: 'Суп из ОВОЩЕЙ с курицей и сметаной',                desc: '300 гр',              price: 35000 },
    { slug: 'first-courses', name: 'СУП-ХАРЧО с говядиной',                             desc: '300 гр',              price: 45000 },
    { slug: 'first-courses', name: 'Суп гороховый с картофелем на овощном бульоне',     desc: '300 гр. ПОСТНОЕ',     price: 25000 },
    // Вторые блюда
    { slug: 'second-courses', name: 'Грудка куриная СУ-ВИД',                  desc: '100 гр',              price: 25000 },
    { slug: 'second-courses', name: 'СТЕЙК из свиной корейки',                desc: '100 гр',              price: 28500 },
    { slug: 'second-courses', name: 'Поджарка из свинины',                    desc: '100/50 гр',           price: 27500 },
    { slug: 'second-courses', name: 'ФРИКАСЕ из куриной грудки',              desc: '200 гр',              price: 35000 },
    { slug: 'second-courses', name: 'Биточки картофельные, соус грибной',     desc: '150/50 гр. ПОСТНОЕ',  price: 15000 },
    { slug: 'second-courses', name: 'Паста с соусом Болоньезе',               desc: '300 гр',              price: 27500 },
    { slug: 'second-courses', name: 'Шашлык из свиной шейки',                 desc: '100 гр',              price: 25000 },
    // Гарниры
    { slug: 'sides', name: 'Картофель ПО-СТОЛИЧНОМУ', desc: '150 гр', price: 15000 },
    { slug: 'sides', name: 'Рис отварной',             desc: '150 гр', price: 12500 },
    { slug: 'sides', name: 'Гречка отварная',          desc: '150 гр', price: 10000 },
    { slug: 'sides', name: 'Спагетти с маслом',        desc: '150 гр', price: 10000 },
    { slug: 'sides', name: 'ОВОЩИ НА ПАРУ',            desc: '150 гр', price: 19500 },
    // Напитки
    { slug: 'drinks', name: 'МОРС',                      desc: '320 мл',            price:  8500 },
    { slug: 'drinks', name: 'МОРС КУВШИН',               desc: '1 литр',            price: 25000 },
    { slug: 'drinks', name: 'Сок ФРЕШ Апельсиновый',     desc: '200 мл',            price: 15000 },
    { slug: 'drinks', name: 'Чай ЧАЙНИК',                desc: 'Заварочный чайник', price: 15000 },
  ]

  for (const item of items) {
    await sql`
      INSERT INTO menu_items (category_id, name, description, price_kopecks, available, is_business_lunch)
      SELECT c.id, ${item.name}, ${item.desc}, ${item.price}, TRUE, FALSE
      FROM categories c WHERE c.slug = ${item.slug}
    `
    process.stdout.write('.')
  }
  console.log(`\n  ✓ Inserted ${items.length} items`)

  // Step 5: Verify
  console.log('\n[5/5] Verification...')
  const cats = await sql`SELECT slug, name, sort_order FROM categories ORDER BY sort_order`
  const count = await sql`SELECT COUNT(*) AS total FROM menu_items`

  console.log('\nCategories:')
  for (const c of cats) console.log(`  ${c.sort_order}. [${c.slug}] ${c.name}`)
  console.log(`\nTotal menu items: ${count[0].total}`)
  console.log('\n✅ Seed complete!')
}

run().catch((err) => {
  console.error('\n❌ Seed failed:', err.message)
  process.exit(1)
})
