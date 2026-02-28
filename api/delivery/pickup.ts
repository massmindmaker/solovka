import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { requireRole } from '../lib/adminAuth'
import { notifyUser } from '../lib/bot'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireRole(req, res, ['delivery', 'admin'])
  if (!auth) return

  const { orderId } = req.body as { orderId?: number }
  if (!orderId) return res.status(400).json({ error: 'orderId is required' })

  try {
    const sql = getDb()

    // Verify order is in 'ready' status and assign courier
    const orderRows = await sql`
      UPDATE orders
      SET status = 'delivering', courier_id = ${auth.userId}, updated_at = NOW()
      WHERE id = ${orderId} AND status = 'ready'
      RETURNING id, user_id AS "userId"
    `

    if (!(orderRows as unknown[]).length) {
      return res.status(400).json({ error: 'Order is not available for pickup (must be "ready")' })
    }

    const order = (orderRows as { id: number; userId: number }[])[0]

    // Get customer telegram_id for notification
    const userRows = await sql`
      SELECT telegram_id AS "telegramId" FROM users WHERE id = ${order.userId}
    `
    const telegramId = (userRows as { telegramId: number }[])[0]?.telegramId

    if (telegramId) {
      await notifyUser(
        telegramId,
        `🚗 <b>Ваш заказ #${orderId} забрал курьер!</b>\n\nОжидайте доставку.`,
      )
    }

    return res.status(200).json({ success: true, orderId, status: 'delivering' })
  } catch (err) {
    console.error('/api/delivery/pickup error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
