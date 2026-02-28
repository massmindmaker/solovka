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

    // Only the assigned courier (or admin) can complete the delivery
    const orderRows = await sql`
      UPDATE orders
      SET status = 'delivered', updated_at = NOW()
      WHERE id = ${orderId}
        AND status = 'delivering'
        AND (courier_id = ${auth.userId} OR ${auth.role} = 'admin')
      RETURNING id, user_id AS "userId"
    `

    if (!(orderRows as unknown[]).length) {
      return res.status(400).json({
        error: 'Order is not available for completion (must be "delivering" and assigned to you)',
      })
    }

    const order = (orderRows as { id: number; userId: number }[])[0]

    // Notify customer
    const userRows = await sql`
      SELECT telegram_id AS "telegramId" FROM users WHERE id = ${order.userId}
    `
    const telegramId = (userRows as { telegramId: number }[])[0]?.telegramId

    if (telegramId) {
      await notifyUser(
        telegramId,
        `🎉 <b>Заказ #${orderId} доставлен!</b>\n\nПриятного аппетита!`,
      )
    }

    return res.status(200).json({ success: true, orderId, status: 'delivered' })
  } catch (err) {
    console.error('/api/delivery/complete error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
