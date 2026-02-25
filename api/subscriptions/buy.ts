import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { requireAuth } from '../lib/auth'
import { upsertUser } from '../lib/userHelper'
import { initPayment as tbankInit } from '../lib/tbank'
import { SUBSCRIPTION_PLANS } from '../lib/constants'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = requireAuth(req, res)
  if (!auth) return

  const { type } = req.body as { type?: string }
  const plan = SUBSCRIPTION_PLANS.find((p) => p.type === type)
  if (!plan) return res.status(400).json({ error: 'Invalid subscription type' })

  try {
    const sql = getDb()
    const userId = await upsertUser(sql, auth.user)
    const appUrl = process.env.APP_URL ?? 'https://localhost:5173'

    // Create a placeholder order for the subscription payment
    const orderRows = await sql`
      INSERT INTO orders
        (user_id, status, total_kopecks, delivery_room, delivery_time, comment, paid_with)
      VALUES
        (${userId}, 'pending', ${plan.priceKopecks},
         'N/A', 'N/A',
         ${'subscription_purchase:' + plan.type},
         'card')
      RETURNING id
    `
    const orderId = (orderRows as { id: number }[])[0].id

    const tbankResponse = await tbankInit({
      Amount: plan.priceKopecks,
      OrderId: `sub-${orderId}`,
      Description: `Подписка "${plan.name}" на 30 дней`,
      NotificationURL: `${appUrl}/api/subscriptions/webhook`,
      SuccessURL: `${appUrl}/profile`,
      FailURL: `${appUrl}/profile`,
    })

    await sql`
      INSERT INTO payments (order_id, tbank_payment_id, tbank_order_id, amount_kopecks)
      VALUES (${orderId}, ${tbankResponse.PaymentId}, ${'sub-' + orderId}, ${plan.priceKopecks})
    `

    return res.status(200).json({ paymentUrl: tbankResponse.PaymentURL })
  } catch (err) {
    console.error('/api/subscriptions/buy error:', err)
    res.status(500).json({ error: 'Failed to initiate subscription purchase' })
  }
}
