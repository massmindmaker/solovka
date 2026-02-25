import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { requireAuth } from '../lib/auth'
import { upsertUser } from '../lib/userHelper'
import { initPayment as tbankInit } from '../lib/tbank'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = requireAuth(req, res)
  if (!auth) return

  const { orderId } = req.body as { orderId?: number }
  if (!orderId) return res.status(400).json({ error: 'orderId is required' })

  try {
    const sql = getDb()
    const userId = await upsertUser(sql, auth.user)

    // Verify order belongs to this user
    const orderRows = await sql`
      SELECT id, total_kopecks, status FROM orders
      WHERE id = ${orderId} AND user_id = ${userId}
    `
    if (!(orderRows as unknown[]).length) {
      return res.status(404).json({ error: 'Order not found' })
    }
    const order = (orderRows as { id: number; total_kopecks: number; status: string }[])[0]

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Order is already paid or cancelled' })
    }

    const appUrl = process.env.APP_URL ?? 'https://localhost:5173'

    // Call T-Bank API
    const tbankResponse = await tbankInit({
      Amount: order.total_kopecks,
      OrderId: String(orderId),
      Description: `Заказ #${orderId} в столовой Solovka`,
      NotificationURL: `${appUrl}/api/payment/webhook`,
      SuccessURL: `${appUrl}/order-success/${orderId}`,
      FailURL: `${appUrl}/checkout`,
    })

    // Store payment record
    await sql`
      INSERT INTO payments (order_id, tbank_payment_id, tbank_order_id, amount_kopecks)
      VALUES (${orderId}, ${tbankResponse.PaymentId}, ${String(orderId)}, ${order.total_kopecks})
      ON CONFLICT DO NOTHING
    `

    return res.status(200).json({
      paymentUrl: tbankResponse.PaymentURL,
      paymentId: tbankResponse.PaymentId,
    })
  } catch (err) {
    console.error('/api/payment/init error:', err)
    res.status(500).json({ error: 'Payment initialization failed' })
  }
}
