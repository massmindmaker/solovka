import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { requireAdmin } from '../lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req, res)
  if (!auth) return

  const sql = getDb()

  try {
    // ── GET /api/admin/menu ───────────────────────────────
    // All menu items (including unavailable)
    if (req.method === 'GET') {
      const items = await sql`
        SELECT
          mi.id,
          mi.category_id     AS "categoryId",
          c.slug             AS "categorySlug",
          c.name             AS "categoryName",
          mi.name,
          mi.description,
          mi.price_kopecks   AS "priceKopecks",
          mi.image_url       AS "imageUrl",
          mi.available,
          mi.is_business_lunch AS "isBusinessLunch",
          mi.created_at      AS "createdAt"
        FROM menu_items mi
        JOIN categories c ON c.id = mi.category_id
        ORDER BY c.sort_order, mi.name
      `
      return res.status(200).json(items)
    }

    // ── POST /api/admin/menu ──────────────────────────────
    // Create a new menu item
    if (req.method === 'POST') {
      const { categoryId, name, description, priceKopecks, imageUrl, isBusinessLunch } =
        req.body as {
          categoryId?: number
          name?: string
          description?: string
          priceKopecks?: number
          imageUrl?: string
          isBusinessLunch?: boolean
        }

      if (!categoryId) return res.status(400).json({ error: 'categoryId is required' })
      if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
      if (!priceKopecks || priceKopecks <= 0) {
        return res.status(400).json({ error: 'priceKopecks must be positive' })
      }

      const rows = await sql`
        INSERT INTO menu_items
          (category_id, name, description, price_kopecks, image_url, available, is_business_lunch)
        VALUES
          (${categoryId}, ${name.trim()}, ${description?.trim() ?? null},
           ${priceKopecks}, ${imageUrl?.trim() ?? null}, TRUE,
           ${isBusinessLunch ?? false})
        RETURNING
          id, category_id AS "categoryId", name, description,
          price_kopecks AS "priceKopecks", image_url AS "imageUrl",
          available, is_business_lunch AS "isBusinessLunch"
      `
      return res.status(201).json(rows[0])
    }

    // ── PUT /api/admin/menu ───────────────────────────────
    // Update a menu item (partial update)
    if (req.method === 'PUT') {
      const { id, name, description, priceKopecks, imageUrl, available, isBusinessLunch, categoryId } =
        req.body as {
          id?: number
          name?: string
          description?: string | null
          priceKopecks?: number
          imageUrl?: string | null
          available?: boolean
          isBusinessLunch?: boolean
          categoryId?: number
        }

      if (!id) return res.status(400).json({ error: 'id is required' })

      // Build dynamic update
      const updates: string[] = []
      const item = await sql`SELECT id FROM menu_items WHERE id = ${id}`
      if (!(item as unknown[]).length) {
        return res.status(404).json({ error: 'Menu item not found' })
      }

      // Update all provided fields at once
      const rows = await sql`
        UPDATE menu_items SET
          name = COALESCE(${name?.trim() ?? null}, name),
          description = CASE WHEN ${description !== undefined} THEN ${description ?? null} ELSE description END,
          price_kopecks = COALESCE(${priceKopecks ?? null}, price_kopecks),
          image_url = CASE WHEN ${imageUrl !== undefined} THEN ${imageUrl ?? null} ELSE image_url END,
          available = COALESCE(${available ?? null}, available),
          is_business_lunch = COALESCE(${isBusinessLunch ?? null}, is_business_lunch),
          category_id = COALESCE(${categoryId ?? null}, category_id),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING
          id, category_id AS "categoryId", name, description,
          price_kopecks AS "priceKopecks", image_url AS "imageUrl",
          available, is_business_lunch AS "isBusinessLunch"
      `
      return res.status(200).json(rows[0])
    }

    // ── DELETE /api/admin/menu ────────────────────────────
    // Soft delete (set available=false)
    if (req.method === 'DELETE') {
      const id = Number(req.query.id ?? req.body?.id)
      if (!id) return res.status(400).json({ error: 'id is required' })

      await sql`
        UPDATE menu_items SET available = FALSE, updated_at = NOW()
        WHERE id = ${id}
      `
      return res.status(200).json({ success: true, id })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('/api/admin/menu error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
