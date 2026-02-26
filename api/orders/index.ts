import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { requireAuth } from '../lib/auth'
import { upsertUser } from '../lib/userHelper'
import { notifyUser, notifyAdmin, formatOrderNotification } from '../lib/bot'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = requireAuth(req, res)
  if (!auth) return

  try {
    const sql = getDb()
    const userId = await upsertUser(sql, auth.user)

    if (req.method === 'GET') {
      // ── GET /api/orders ──────────────────────────────────
      const orders = await sql`
        SELECT
          o.id,
          o.status,
          o.total_kopecks   AS "totalKopecks",
          o.delivery_room   AS "deliveryRoom",
          o.delivery_time   AS "deliveryTime",
          o.comment,
          o.paid_with       AS "paidWith",
          o.created_at      AS "createdAt"
        FROM orders o
        WHERE o.user_id = ${userId}
        ORDER BY o.created_at DESC
        LIMIT 50
      `

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

    if (req.method === 'POST') {
      // ── POST /api/orders ─────────────────────────────────
      interface CreateBody {
        items: { itemId: number; quantity: number }[]
        deliveryRoom: string
        deliveryTime: string
        comment?: string
        paymentMethod: 'card' | 'talon' | 'subscription'
      }

      const body = req.body as CreateBody

      if (!body.items?.length) return res.status(400).json({ error: 'items is required' })
      if (!body.deliveryRoom) return res.status(400).json({ error: 'deliveryRoom is required' })
      if (!body.deliveryTime) return res.status(400).json({ error: 'deliveryTime is required' })
      if (!body.paymentMethod) return res.status(400).json({ error: 'paymentMethod is required' })

      // Fetch prices from DB (never trust client prices)
      const itemIds = body.items.map((i) => i.itemId)
      const menuRows = await sql`
        SELECT id, name, price_kopecks
        FROM menu_items
        WHERE id = ANY(${itemIds}) AND available = TRUE
      `

      if ((menuRows as unknown[]).length !== itemIds.length) {
        return res.status(400).json({ error: 'Some items are unavailable' })
      }

      type MenuRow = { id: number; name: string; price_kopecks: number }
      const priceMap = new Map<number, MenuRow>(
        (menuRows as MenuRow[]).map((m) => [m.id, m]),
      )

      let totalKopecks = 0
      for (const item of body.items) {
        const m = priceMap.get(item.itemId)!
        totalKopecks += m.price_kopecks * item.quantity
      }

      const initialStatus = body.paymentMethod === 'card' ? 'pending' : 'paid'

      // Create order
      const orderRows = await sql`
        INSERT INTO orders
          (user_id, status, total_kopecks, delivery_room, delivery_time, comment, paid_with)
        VALUES
          (${userId}, ${initialStatus}, ${totalKopecks},
           ${body.deliveryRoom}, ${body.deliveryTime},
           ${body.comment ?? null}, ${body.paymentMethod})
        RETURNING
          id, status,
          total_kopecks   AS "totalKopecks",
          delivery_room   AS "deliveryRoom",
          delivery_time   AS "deliveryTime",
          comment,
          paid_with       AS "paidWith",
          created_at      AS "createdAt"
      `

      const order = (orderRows as { id: number }[])[0]
      const orderId = order.id

      // Insert items
      for (const item of body.items) {
        const m = priceMap.get(item.itemId)!
        await sql`
          INSERT INTO order_items (order_id, item_id, quantity, price_kopecks, item_name)
          VALUES (${orderId}, ${item.itemId}, ${item.quantity}, ${m.price_kopecks}, ${m.name})
        `
      }

      // Talon payment: deduct balance
      if (body.paymentMethod === 'talon') {
        const talon = await sql`
          SELECT id, balance FROM talons
          WHERE user_id = ${userId} AND type = 'lunch' AND balance > 0
        `
        if (!(talon as unknown[]).length) {
          return res.status(400).json({ error: 'No lunch talons available' })
        }
        const talonRow = (talon as { id: number; balance: number }[])[0]

        await sql`
          UPDATE talons SET balance = balance - 1, updated_at = NOW()
          WHERE id = ${talonRow.id}
        `
        await sql`
          INSERT INTO talon_transactions (talon_id, order_id, delta, description)
          VALUES (${talonRow.id}, ${orderId}, -1, ${'Заказ #' + orderId})
        `
      }

      // Subscription payment: verify subscription exists
      if (body.paymentMethod === 'subscription') {
        const sub = await sql`
          SELECT id FROM subscriptions
          WHERE user_id = ${userId}
            AND active = TRUE
            AND expires_at > NOW()
            AND type IN ('lunch', 'lunch_coffee')
          LIMIT 1
        `
        if (!(sub as unknown[]).length) {
          return res.status(400).json({ error: 'No active subscription' })
        }
      }

      const orderItems = await sql`
        SELECT id, item_id AS "itemId", item_name AS "itemName",
               quantity, price_kopecks AS "priceKopecks"
        FROM order_items WHERE order_id = ${orderId}
      `

      // Notify for non-card payments (card confirmed by T-Bank webhook)
      if (body.paymentMethod !== 'card') {
        const notification = formatOrderNotification(
          orderId,
          (orderItems as { itemName: string; quantity: number }[]).map((i) => ({
            itemName: i.itemName,
            quantity: i.quantity,
          })),
          totalKopecks,
          body.deliveryRoom,
          body.deliveryTime,
        )
        await notifyUser(auth.user.id, notification)
        await notifyAdmin(`🆕 Новый заказ #${orderId} (${body.paymentMethod})`)
      }

      return res.status(201).json({ ...order, items: orderItems })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('/api/orders error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
