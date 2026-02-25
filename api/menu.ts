import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './lib/db'
import { requireAuth } from './lib/auth'
import { upsertUser } from './lib/userHelper'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = requireAuth(req, res)
  if (!auth) return

  try {
    const sql = getDb()
    await upsertUser(sql, auth.user)

    const todayStr = new Date().toISOString().slice(0, 10)

    // Load categories
    const categories = await sql`
      SELECT id, name, slug, sort_order AS "sortOrder", icon
      FROM categories
      ORDER BY sort_order
    `

    // Load all available menu items with category slug
    const items = await sql`
      SELECT
        m.id,
        m.category_id AS "categoryId",
        c.slug AS "categorySlug",
        m.name,
        m.description,
        m.price_kopecks AS "priceKopecks",
        m.image_url AS "imageUrl",
        m.available,
        m.is_business_lunch AS "isBusinessLunch"
      FROM menu_items m
      JOIN categories c ON m.category_id = c.id
      WHERE m.available = TRUE
      ORDER BY c.sort_order, m.id
    `

    // Load today's daily menu item ids
    const dailyRows = await sql`
      SELECT item_id AS "itemId" FROM daily_menu WHERE date = ${todayStr}
    `
    const dailyItemIds = (dailyRows as { itemId: number }[]).map((r) => r.itemId)

    res.status(200).json({
      categories,
      items,
      dailyItemIds,
    })
  } catch (err) {
    console.error('/api/menu error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
