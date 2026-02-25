import crypto from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// ─── Types ───────────────────────────────────────────────

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
}

// ─── Validate Telegram initData ──────────────────────────

export function validateInitData(initData: string, botToken: string): boolean {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return false

    params.delete('hash')

    // Sort params alphabetically, join as "key=value\n..."
    const checkStr = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
    const expectedHash = crypto.createHmac('sha256', secretKey).update(checkStr).digest('hex')

    return expectedHash === hash
  } catch {
    return false
  }
}

// ─── Parse user from initData ────────────────────────────

export function parseInitDataUser(initData: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData)
    const userStr = params.get('user')
    if (!userStr) return null
    return JSON.parse(userStr) as TelegramUser
  } catch {
    return null
  }
}

// ─── Auth middleware ─────────────────────────────────────
// Usage: const { user } = requireAuth(req, res)
// Returns null and sends 401 if unauthorized.

export interface AuthResult {
  user: TelegramUser
  initData: string
}

export function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): AuthResult | null {
  const botToken = process.env.BOT_TOKEN
  if (!botToken) {
    res.status(500).json({ error: 'BOT_TOKEN not configured' })
    return null
  }

  const authHeader = (req.headers.authorization ?? '').trim()
  if (!authHeader.startsWith('tma')) {
    res.status(401).json({ error: 'Missing Authorization header' })
    return null
  }

  // Strip "tma" prefix and optional space
  const initData = authHeader.slice(3).trim()

  // In development (BOT_TOKEN = "dev"), skip validation entirely
  if (botToken === 'dev') {
    const user = parseInitDataUser(initData)
    return {
      user: user ?? { id: 123456789, first_name: 'Dev', username: 'dev' },
      initData,
    }
  }

  if (!validateInitData(initData, botToken)) {
    res.status(401).json({ error: 'Invalid initData' })
    return null
  }

  const user = parseInitDataUser(initData)
  if (!user) {
    res.status(401).json({ error: 'Cannot parse user from initData' })
    return null
  }

  return { user, initData }
}
