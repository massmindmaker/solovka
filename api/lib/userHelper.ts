import type { NeonQueryFunction } from '@neondatabase/serverless'
import type { TelegramUser } from './auth'

// Upsert user on every authenticated request
// Returns the internal DB user id
export async function upsertUser(
  sql: NeonQueryFunction<false, false>,
  tgUser: TelegramUser,
): Promise<number> {
  const rows = await sql`
    INSERT INTO users (telegram_id, first_name, last_name, username)
    VALUES (
      ${tgUser.id},
      ${tgUser.first_name},
      ${tgUser.last_name ?? null},
      ${tgUser.username ?? null}
    )
    ON CONFLICT (telegram_id)
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name  = EXCLUDED.last_name,
      username   = EXCLUDED.username
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}
