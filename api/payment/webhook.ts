import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { verifyWebhookToken } from '../lib/tbank'
import { notifyUser, notifyAdmin, formatOrderNotification } from '../lib/bot'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ALWAYS respond 200 OK — T-Bank will retry for a month otherwise
  try {
    const payload = req.body as Record<string, string | number | boolean | undefined>

    // 1. Verify signature
    const receivedToken = payload.Token as string
    if (!receivedToken || !verifyWebhookToken(payload, receivedToken)) {
      console.error('T-Bank webhook: invalid token', { OrderId: payload.OrderId })
      return res.status(200).send('OK')
    }

    const status = payload.Status as string
    const orderId = Number(payload.OrderId)
    const paymentId = String(payload.PaymentId)

    console.log(`T-Bank webhook: OrderId=${orderId} Status=${status}`)

    if (!orderId) return res.status(200).send('OK')

    const sql = getDb()

    // 2. Update payment record
    await sql`
      UPDATE payments
      SET status = ${status.toLowerCase()}, updated_at = NOW()
      WHERE tbank_payment_id = ${paymentId} OR tbank_order_id = ${String(orderId)}
    `

    // 3. Handle CONFIRMED status
    if (status === 'CONFIRMED' && payload.Success) {
      // Update order to paid
      const orderRows = await sql`
        UPDATE orders SET status = 'paid', updated_at = NOW()
        WHERE id = ${orderId} AND status = 'pending'
        RETURNING id, user_id AS "userId", total_kopecks AS "totalKopecks",
                  delivery_room AS "deliveryRoom", delivery_time AS "deliveryTime"
      `

      if ((orderRows as unknown[]).length > 0) {
        const order = (orderRows as {
          id: number
          userId: number
          totalKopecks: number
          deliveryRoom: string
          deliveryTime: string
        }[])[0]

        // Get order items and user telegram_id for notification
        const [itemRows, userRows] = await Promise.all([
          sql`
            SELECT item_name AS "itemName", quantity
            FROM order_items WHERE order_id = ${orderId}
          `,
          sql`
            SELECT telegram_id AS "telegramId" FROM users WHERE id = ${order.userId}
          `,
        ])

        const telegramId = (userRows as { telegramId: number }[])[0]?.telegramId

        if (telegramId) {
          const notification = formatOrderNotification(
            order.id,
            itemRows as { itemName: string; quantity: number }[],
            order.totalKopecks,
            order.deliveryRoom,
            order.deliveryTime,
          )
          await notifyUser(telegramId, notification)
        }

        await notifyAdmin(`✅ Оплачен заказ #${orderId} (T-Bank)`)
      }
    }

    // 4. Handle REJECTED status
    if (status === 'REJECTED') {
      await sql`
        UPDATE orders SET status = 'cancelled', updated_at = NOW()
        WHERE id = ${orderId} AND status = 'pending'
      `
    }

    return res.status(200).send('OK')
  } catch (err) {
    // Log error but ALWAYS return 200 to prevent T-Bank retries
    console.error('/api/payment/webhook unhandled error:', err)
    return res.status(200).send('OK')
  }
}
