import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { requireAdmin } from '../lib/adminAuth'
import { notifyUser } from '../lib/bot'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req, res)
  if (!auth) return

  const sql = getDb()

  try {
    // ── GET /api/admin/orders ─────────────────────────────
    // List orders with optional status filter
    if (req.method === 'GET') {
      const status = req.query.status as string | undefined
      const limit = Math.min(Number(req.query.limit) || 50, 200)

      let orders
      if (status) {
        orders = await sql`
          SELECT
            o.id,
            o.status,
            o.total_kopecks    AS "totalKopecks",
            o.delivery_room    AS "deliveryAddress",
            o.delivery_time    AS "deliveryTime",
            o.comment,
            o.paid_with        AS "paidWith",
            o.courier_id       AS "courierId",
            o.created_at       AS "createdAt",
            o.updated_at       AS "updatedAt",
            u.first_name       AS "customerFirstName",
            u.last_name        AS "customerLastName",
            u.username         AS "customerUsername",
            u.telegram_id      AS "customerTelegramId"
          FROM orders o
          JOIN users u ON u.id = o.user_id
          WHERE o.status = ${status}
          ORDER BY o.created_at DESC
          LIMIT ${limit}
        `
      } else {
        orders = await sql`
          SELECT
            o.id,
            o.status,
            o.total_kopecks    AS "totalKopecks",
            o.delivery_room    AS "deliveryAddress",
            o.delivery_time    AS "deliveryTime",
            o.comment,
            o.paid_with        AS "paidWith",
            o.courier_id       AS "courierId",
            o.created_at       AS "createdAt",
            o.updated_at       AS "updatedAt",
            u.first_name       AS "customerFirstName",
            u.last_name        AS "customerLastName",
            u.username         AS "customerUsername",
            u.telegram_id      AS "customerTelegramId"
          FROM orders o
          JOIN users u ON u.id = o.user_id
          ORDER BY o.created_at DESC
          LIMIT ${limit}
        `
      }

      // Fetch items for all orders
      const orderIds = (orders as { id: number }[]).map((o) => o.id)
      let itemRows: unknown[] = []
      if (orderIds.length > 0) {
        itemRows = await sql`
          SELECT
            oi.id,
            oi.order_id     AS "orderId",
            oi.item_id      AS "itemId",
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
    }

    // ── PUT /api/admin/orders ─────────────────────────────
    // Update order status
    if (req.method === 'PUT') {
      const { orderId, status } = req.body as {
        orderId?: number
        status?: string
      }

      if (!orderId) return res.status(400).json({ error: 'orderId is required' })
      if (!status) return res.status(400).json({ error: 'status is required' })

      const validTransitions: Record<string, string[]> = {
        paid: ['ready', 'cancelled'],
        ready: ['delivering', 'cancelled'],
        preparing: ['ready', 'cancelled'],
      }

      // Get current status
      const orderRows = await sql`
        SELECT o.id, o.status, o.user_id AS "userId",
               u.telegram_id AS "telegramId"
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE o.id = ${orderId}
      `

      if (!(orderRows as unknown[]).length) {
        return res.status(404).json({ error: 'Order not found' })
      }

      const order = (orderRows as {
        id: number
        status: string
        userId: number
        telegramId: number
      }[])[0]

      const allowed = validTransitions[order.status]
      if (!allowed || !allowed.includes(status)) {
        return res.status(400).json({
          error: `Cannot transition from "${order.status}" to "${status}"`,
        })
      }

      // Update status
      await sql`
        UPDATE orders SET status = ${status}, updated_at = NOW()
        WHERE id = ${orderId}
      `

      // Notify customer
      const statusLabels: Record<string, string> = {
        ready: '✅ Ваш заказ готов и ожидает курьера!',
        cancelled: '❌ Ваш заказ был отменён.',
        delivering: '🚗 Ваш заказ передан курьеру!',
      }

      const message = statusLabels[status]
      if (message) {
        await notifyUser(
          order.telegramId,
          `${message}\n\nЗаказ #${orderId}`,
        )
      }

      return res.status(200).json({ success: true, orderId, status })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('/api/admin/orders error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
