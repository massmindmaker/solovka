import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { verifyWebhookToken } from '../lib/tbank'
import { notifyUser } from '../lib/bot'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const payload = req.body as Record<string, string | number | boolean | undefined>

    const receivedToken = payload.Token as string
    if (!receivedToken || !verifyWebhookToken(payload, receivedToken)) {
      console.error('T-Bank subscription webhook: invalid token')
      return res.status(200).send('OK')
    }

    const status = payload.Status as string
    if (status !== 'CONFIRMED' || !payload.Success) {
      return res.status(200).send('OK')
    }

    const tbOrderId = String(payload.OrderId) // "sub-<orderId>"
    const sql = getDb()

    const orderRows = await sql`
      SELECT o.id, o.user_id AS "userId", o.comment,
             u.telegram_id AS "telegramId"
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.id = ${Number(tbOrderId.replace('sub-', ''))}
        AND o.status = 'pending'
    `

    if (!(orderRows as unknown[]).length) return res.status(200).send('OK')

    const order = (orderRows as {
      id: number
      userId: number
      comment: string
      telegramId: number
    }[])[0]

    // Parse comment: "subscription_purchase:<type>"
    const match = order.comment.match(/^subscription_purchase:(lunch|coffee|lunch_coffee)$/)
    if (!match) return res.status(200).send('OK')

    const subType = match[1]
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Create subscription
    await sql`
      INSERT INTO subscriptions (user_id, type, active, expires_at)
      VALUES (${order.userId}, ${subType}, TRUE, ${expiresAt})
    `

    // Update order status
    await sql`
      UPDATE orders SET status = 'paid', updated_at = NOW() WHERE id = ${order.id}
    `

    const subNames: Record<string, string> = {
      lunch: 'Бизнес-ланч',
      coffee: 'Кофе',
      lunch_coffee: 'Бизнес-ланч + Кофе',
    }

    await notifyUser(
      order.telegramId,
      `✅ <b>Подписка активирована!</b>\n\n` +
      `Тариф: ${subNames[subType] ?? subType}\n` +
      `Действует до: ${new Date(expiresAt).toLocaleDateString('ru-RU')}`,
    )

    return res.status(200).send('OK')
  } catch (err) {
    console.error('/api/subscriptions/webhook error:', err)
    return res.status(200).send('OK')
  }
}
