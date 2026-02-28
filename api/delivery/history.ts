import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { requireRole } from '../lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireRole(req, res, ['delivery', 'admin'])
  if (!auth) return

  try {
    const sql = getDb()

    // Get deliveries by this courier for today
    const orders = await sql`
      SELECT
        o.id,
        o.status,
        o.total_kopecks    AS "totalKopecks",
        o.delivery_room    AS "deliveryAddress",
        o.delivery_time    AS "deliveryTime",
        o.comment,
        o.created_at       AS "createdAt",
        o.updated_at       AS "updatedAt",
        u.first_name       AS "customerFirstName",
        u.last_name        AS "customerLastName"
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.courier_id = ${auth.userId}
        AND o.updated_at >= CURRENT_DATE
        AND o.status IN ('delivering', 'delivered')
      ORDER BY o.updated_at DESC
    `

    // Fetch items
    const orderIds = (orders as { id: number }[]).map((o) => o.id)
    let itemRows: unknown[] = []
    if (orderIds.length > 0) {
      itemRows = await sql`
        SELECT
          oi.order_id     AS "orderId",
          oi.item_name    AS "itemName",
          oi.quantity
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

    // Summary stats
    const delivered = (orders as { status: string }[]).filter((o) => o.status === 'delivered').length
    const inProgress = (orders as { status: string }[]).filter((o) => o.status === 'delivering').length

    return res.status(200).json({
      orders: result,
      stats: { delivered, inProgress, total: result.length },
    })
  } catch (err) {
    console.error('/api/delivery/history error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
