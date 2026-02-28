import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { requireAuth } from '../lib/auth'
import { upsertUser } from '../lib/userHelper'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = requireAuth(req, res)
  if (!auth) return

  const orderId = Number(req.query.id)
  if (!orderId || isNaN(orderId)) {
    return res.status(400).json({ error: 'Invalid order id' })
  }

  try {
    const sql = getDb()
    const userId = await upsertUser(sql, auth.user)

    const orderRows = await sql`
      SELECT
        o.id,
        o.status,
        o.total_kopecks   AS "totalKopecks",
        o.delivery_room   AS "deliveryAddress",
        o.delivery_time   AS "deliveryTime",
        o.comment,
        o.paid_with       AS "paidWith",
        o.created_at      AS "createdAt",
        o.updated_at      AS "updatedAt"
      FROM orders o
      WHERE o.id = ${orderId} AND o.user_id = ${userId}
    `

    if (!(orderRows as unknown[]).length) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const order = (orderRows as { id: number }[])[0]

    const items = await sql`
      SELECT
        id,
        item_id       AS "itemId",
        item_name     AS "itemName",
        quantity,
        price_kopecks AS "priceKopecks"
      FROM order_items
      WHERE order_id = ${orderId}
    `

    return res.status(200).json({ ...order, items })
  } catch (err) {
    console.error('/api/orders/[id] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
