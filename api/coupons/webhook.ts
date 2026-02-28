import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { verifyWebhookToken } from '../lib/tbank'
import { notifyUser } from '../lib/bot'
import { plural } from '../lib/utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const payload = req.body as Record<string, string | number | boolean | undefined>

    const receivedToken = payload.Token as string
    if (!receivedToken || !verifyWebhookToken(payload, receivedToken)) {
      console.error('T-Bank coupon webhook: invalid token')
      return res.status(200).send('OK')
    }

    const status = payload.Status as string
    const tbOrderId = String(payload.OrderId) // "coupon-<orderId>"

    if (status !== 'CONFIRMED' || !payload.Success) {
      return res.status(200).send('OK')
    }

    const sql = getDb()

    // Get the order to find user and purchase details
    const orderRows = await sql`
      SELECT o.id, o.user_id AS "userId", o.comment,
             u.telegram_id AS "telegramId"
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.id = ${Number(tbOrderId.replace('coupon-', ''))}
        AND o.status = 'pending'
    `

    if (!(orderRows as unknown[]).length) return res.status(200).send('OK')

    const order = (orderRows as {
      id: number
      userId: number
      comment: string
      telegramId: number
    }[])[0]

    // Parse the comment: "coupon_purchase:<type>:<quantity>"
    const match = order.comment.match(/^coupon_purchase:(lunch|coffee):(\d+)$/)
    if (!match) return res.status(200).send('OK')

    const couponType = match[1] as 'lunch' | 'coffee'
    const quantity = Number(match[2])

    // Credit the coupons (DB table is still `talons`)
    const couponRows = await sql`
      INSERT INTO talons (user_id, type, balance)
      VALUES (${order.userId}, ${couponType}, ${quantity})
      ON CONFLICT (user_id, type)
      DO UPDATE SET balance = talons.balance + ${quantity}, updated_at = NOW()
      RETURNING id, balance
    `

    const coupon = (couponRows as { id: number; balance: number }[])[0]

    // Log transaction
    await sql`
      INSERT INTO talon_transactions (talon_id, order_id, delta, description)
      VALUES (${coupon.id}, ${order.id}, ${quantity}, ${'Покупка ' + quantity + ' купонов'})
    `

    // Update order status
    await sql`
      UPDATE orders SET status = 'paid', updated_at = NOW() WHERE id = ${order.id}
    `

    // Notify user
    await notifyUser(
      order.telegramId,
      `✅ <b>Купоны зачислены!</b>\n\n` +
      `Куплено: ${quantity} ${plural(quantity, 'купон', 'купона', 'купонов')}\n` +
      `Баланс: ${coupon.balance} ${plural(coupon.balance, 'купон', 'купона', 'купонов')}`,
    )

    return res.status(200).send('OK')
  } catch (err) {
    console.error('/api/coupons/webhook error:', err)
    return res.status(200).send('OK')
  }
}
