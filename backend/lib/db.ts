import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// Create a new SQL client for each request — required for Vercel serverless
export function getDb(): NeonQueryFunction<false, false> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is not set')
  return neon(databaseUrl)
}

export type Sql = NeonQueryFunction<false, false>
