import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { requireAdmin } from '../lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req, res)
  if (!auth) return

  const sql = getDb()

  try {
    // ── GET /api/admin/daily-menu?date=YYYY-MM-DD ─────────
    if (req.method === 'GET') {
      const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10)

      const items = await sql`
        SELECT
          dm.id,
          dm.date,
          dm.menu_item_id    AS "menuItemId",
          mi.name,
          mi.description,
          mi.price_kopecks   AS "priceKopecks",
          mi.image_url       AS "imageUrl",
          mi.available,
          c.name             AS "categoryName",
          c.slug             AS "categorySlug"
        FROM daily_menu dm
        JOIN menu_items mi ON mi.id = dm.menu_item_id
        JOIN categories c ON c.id = mi.category_id
        WHERE dm.date = ${date}
        ORDER BY c.sort_order, mi.name
      `

      return res.status(200).json({ date, items })
    }

    // ── PUT /api/admin/daily-menu ─────────────────────────
    // Set daily menu for a date (replace all)
    if (req.method === 'PUT') {
      const { date, itemIds } = req.body as {
        date?: string
        itemIds?: number[]
      }

      if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' })
      if (!Array.isArray(itemIds)) {
        return res.status(400).json({ error: 'itemIds must be an array of menu item IDs' })
      }

      // Delete existing daily menu for this date
      await sql`DELETE FROM daily_menu WHERE date = ${date}`

      // Insert new items
      if (itemIds.length > 0) {
        for (const itemId of itemIds) {
          await sql`
            INSERT INTO daily_menu (date, menu_item_id)
            VALUES (${date}, ${itemId})
            ON CONFLICT DO NOTHING
          `
        }
      }

      // Return the updated daily menu
      const items = await sql`
        SELECT
          dm.id,
          dm.date,
          dm.menu_item_id    AS "menuItemId",
          mi.name,
          mi.price_kopecks   AS "priceKopecks",
          mi.image_url       AS "imageUrl",
          c.name             AS "categoryName"
        FROM daily_menu dm
        JOIN menu_items mi ON mi.id = dm.menu_item_id
        JOIN categories c ON c.id = mi.category_id
        WHERE dm.date = ${date}
        ORDER BY c.sort_order, mi.name
      `

      return res.status(200).json({ date, items })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('/api/admin/daily-menu error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
