import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth, type AuthResult } from './auth'
import { getDb } from './db'
import { upsertUser } from './userHelper'

export type UserRole = 'customer' | 'admin' | 'delivery'

export interface AdminAuthResult extends AuthResult {
  userId: number
  role: UserRole
}

/**
 * Require a specific role (or set of roles) to access the endpoint.
 * Returns null and sends 403 if the user doesn't have the required role.
 */
export async function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  allowedRoles: UserRole[],
): Promise<AdminAuthResult | null> {
  const auth = requireAuth(req, res)
  if (!auth) return null

  const sql = getDb()
  const userId = await upsertUser(sql, auth.user)

  const rows = await sql`
    SELECT role FROM users WHERE id = ${userId}
  `
  const role = ((rows as { role: string }[])[0]?.role ?? 'customer') as UserRole

  if (!allowedRoles.includes(role)) {
    res.status(403).json({ error: 'Forbidden: insufficient permissions' })
    return null
  }

  return { ...auth, userId, role }
}

/**
 * Shortcut: require admin role.
 */
export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AdminAuthResult | null> {
  return requireRole(req, res, ['admin'])
}
