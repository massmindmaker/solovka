import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { requireAuth } from '../lib/auth'
import { upsertUser } from '../lib/userHelper'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = requireAuth(req, res)
  if (!auth) return

  try {
    const sql = getDb()
    const userId = await upsertUser(sql, auth.user)

    // Get user record
    const users = await sql`
      SELECT id, telegram_id AS "telegramId", first_name AS "firstName",
             last_name AS "lastName", username, notify_daily_menu AS "notifyDailyMenu",
             COALESCE(role, 'customer') AS role,
             created_at AS "createdAt"
      FROM users WHERE id = ${userId}
    `
    const user = users[0]

    // Get coupon balances
    const coupons = await sql`
      SELECT type, balance FROM talons WHERE user_id = ${userId}
    `

    // Ensure both lunch and coffee rows exist
    const couponMap = Object.fromEntries(
      (coupons as { type: string; balance: number }[]).map((t) => [t.type, t.balance]),
    )
    const couponResponse = [
      { type: 'lunch', balance: couponMap['lunch'] ?? 0 },
      { type: 'coffee', balance: couponMap['coffee'] ?? 0 },
    ]

    // Get active subscriptions
    const subscriptions = await sql`
      SELECT id, type, active, expires_at AS "expiresAt"
      FROM subscriptions
      WHERE user_id = ${userId}
        AND active = TRUE
        AND expires_at > NOW()
      ORDER BY created_at DESC
    `

    res.status(200).json({
      user,
      coupons: couponResponse,
      subscriptions,
    })
  } catch (err) {
    console.error('/api/users/me error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
