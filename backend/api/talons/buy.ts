import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../../lib/db'
import { requireAuth } from '../../lib/auth'
import { upsertUser } from '../../lib/userHelper'
import { initPayment as tbankInit } from '../../lib/tbank'
import { notifyUser } from '../../lib/bot'
import { TALON_PACKAGES } from '../../lib/constants'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = requireAuth(req, res)
  if (!auth) return

  const { type, quantity } = req.body as {
    type?: 'lunch' | 'coffee'
    quantity?: 5 | 10 | 20
  }

  if (!type || !['lunch', 'coffee'].includes(type)) {
    return res.status(400).json({ error: 'type must be "lunch" or "coffee"' })
  }
  if (!quantity || ![5, 10, 20].includes(quantity)) {
    return res.status(400).json({ error: 'quantity must be 5, 10, or 20' })
  }

  const pkg = TALON_PACKAGES.find((p) => p.quantity === quantity)
  if (!pkg) return res.status(400).json({ error: 'Invalid package' })

  try {
    const sql = getDb()
    const userId = await upsertUser(sql, auth.user)
    const appUrl = process.env.APP_URL ?? 'https://localhost:5173'

    // Create a placeholder order for the talon purchase payment
    const orderRows = await sql`
      INSERT INTO orders
        (user_id, status, total_kopecks, delivery_room, delivery_time, comment, paid_with)
      VALUES
        (${userId}, 'pending', ${pkg.priceKopecks},
         'N/A', 'N/A',
         ${'Покупка ' + quantity + ' ' + type + ' талонов'},
         'card')
      RETURNING id
    `
    const orderId = (orderRows as { id: number }[])[0].id

    // Initiate T-Bank payment
    const tbankResponse = await tbankInit({
      Amount: pkg.priceKopecks,
      OrderId: `talon-${orderId}`,
      Description: `Покупка ${quantity} ${type === 'lunch' ? 'обеденных' : 'кофейных'} талонов`,
      NotificationURL: `${appUrl}/api/talons/webhook`,
      SuccessURL: `${appUrl}/talons`,
      FailURL: `${appUrl}/talons`,
    })

    await sql`
      INSERT INTO payments (order_id, tbank_payment_id, tbank_order_id, amount_kopecks)
      VALUES (${orderId}, ${tbankResponse.PaymentId}, ${'talon-' + orderId}, ${pkg.priceKopecks})
    `

    // Store metadata about what was purchased so the webhook can credit talons
    await sql`
      UPDATE orders SET comment = ${'talon_purchase:' + type + ':' + quantity}
      WHERE id = ${orderId}
    `

    return res.status(200).json({ paymentUrl: tbankResponse.PaymentURL })
  } catch (err) {
    console.error('/api/talons/buy error:', err)
    res.status(500).json({ error: 'Failed to initiate talon purchase' })
  }
}

// Suppress unused import warning
void notifyUser
