import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { upsertUser } from '../../../lib/userHelper'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const auth = requireAuth(req, res)
  if (!auth) return

  const { enabled } = req.body as { enabled?: boolean }
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' })
  }

  try {
    const sql = getDb()
    const userId = await upsertUser(sql, auth.user)

    await sql`
      UPDATE users
      SET notify_daily_menu = ${enabled}
      WHERE id = ${userId}
    `

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('/api/users/me/notifications error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
