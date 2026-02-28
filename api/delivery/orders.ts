import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { requireRole } from '../lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireRole(req, res, ['delivery', 'admin'])
  if (!auth) return

  try {
    const sql = getDb()

    // Return orders that are ready for pickup (status = 'ready')
    const orders = await sql`
      SELECT
        o.id,
        o.status,
        o.total_kopecks    AS "totalKopecks",
        o.delivery_room    AS "deliveryAddress",
        o.delivery_time    AS "deliveryTime",
        o.comment,
        o.paid_with        AS "paidWith",
        o.created_at       AS "createdAt",
        u.first_name       AS "customerFirstName",
        u.last_name        AS "customerLastName",
        u.username         AS "customerUsername"
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.status = 'ready'
      ORDER BY o.delivery_time ASC, o.created_at ASC
    `

    // Fetch items for all orders
    const orderIds = (orders as { id: number }[]).map((o) => o.id)
    let itemRows: unknown[] = []
    if (orderIds.length > 0) {
      itemRows = await sql`
        SELECT
          oi.id,
          oi.order_id     AS "orderId",
          oi.item_name    AS "itemName",
          oi.quantity,
          oi.price_kopecks AS "priceKopecks"
        FROM order_items oi
        WHERE oi.order_id = ANY(${orderIds})
      `
    }

    const itemsByOrder = new Map<number, unknown[]>()
    for (const item of itemRows as { orderId: number }[]) {
      const arr = itemsByOrder.get(item.orderId) ?? []
      arr.push(item)
      itemsByOrder.set(item.orderId, arr)
    }

    const result = (orders as { id: number }[]).map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id) ?? [],
    }))

    return res.status(200).json(result)
  } catch (err) {
    console.error('/api/delivery/orders error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
