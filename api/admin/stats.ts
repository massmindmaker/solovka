import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { requireAdmin } from '../lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAdmin(req, res)
  if (!auth) return

  try {
    const sql = getDb()

    // Period filter: day, week, month (default: week)
    const period = (req.query.period as string) ?? 'week'
    let intervalSql: string
    switch (period) {
      case 'day':
        intervalSql = '1 day'
        break
      case 'month':
        intervalSql = '30 days'
        break
      default:
        intervalSql = '7 days'
    }

    // 1. Revenue & order count
    const revenueRows = await sql`
      SELECT
        COALESCE(SUM(total_kopecks), 0) AS "totalRevenue",
        COUNT(*)::int AS "orderCount",
        CASE WHEN COUNT(*) > 0
          THEN ROUND(SUM(total_kopecks)::numeric / COUNT(*))::int
          ELSE 0
        END AS "avgCheck"
      FROM orders
      WHERE status IN ('paid', 'ready', 'delivering', 'delivered')
        AND created_at >= NOW() - ${intervalSql}::interval
    `
    const revenue = (revenueRows as {
      totalRevenue: number
      orderCount: number
      avgCheck: number
    }[])[0]

    // 2. Orders by status
    const statusRows = await sql`
      SELECT status, COUNT(*)::int AS count
      FROM orders
      WHERE created_at >= NOW() - ${intervalSql}::interval
      GROUP BY status
      ORDER BY count DESC
    `

    // 3. Top dishes
    const topDishes = await sql`
      SELECT
        oi.item_name AS "itemName",
        SUM(oi.quantity)::int AS "totalQuantity",
        SUM(oi.price_kopecks * oi.quantity)::int AS "totalRevenue"
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status IN ('paid', 'ready', 'delivering', 'delivered')
        AND o.created_at >= NOW() - ${intervalSql}::interval
      GROUP BY oi.item_name
      ORDER BY "totalQuantity" DESC
      LIMIT 10
    `

    // 4. Payment method distribution
    const paymentRows = await sql`
      SELECT
        COALESCE(paid_with, 'card') AS method,
        COUNT(*)::int AS count
      FROM orders
      WHERE status IN ('paid', 'ready', 'delivering', 'delivered')
        AND created_at >= NOW() - ${intervalSql}::interval
      GROUP BY paid_with
      ORDER BY count DESC
    `

    // 5. Deliveries by courier
    const courierRows = await sql`
      SELECT
        u.first_name AS "firstName",
        u.last_name AS "lastName",
        COUNT(*)::int AS "deliveryCount"
      FROM orders o
      JOIN users u ON u.id = o.courier_id
      WHERE o.status IN ('delivering', 'delivered')
        AND o.updated_at >= NOW() - ${intervalSql}::interval
        AND o.courier_id IS NOT NULL
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY "deliveryCount" DESC
    `

    // 6. Daily revenue chart (last 7 or 30 days)
    const chartDays = period === 'month' ? 30 : 7
    const dailyRevenue = await sql`
      SELECT
        DATE(created_at) AS date,
        COALESCE(SUM(total_kopecks), 0)::int AS revenue,
        COUNT(*)::int AS orders
      FROM orders
      WHERE status IN ('paid', 'ready', 'delivering', 'delivered')
        AND created_at >= NOW() - ${String(chartDays) + ' days'}::interval
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    return res.status(200).json({
      period,
      revenue: {
        total: Number(revenue.totalRevenue),
        orderCount: revenue.orderCount,
        avgCheck: revenue.avgCheck,
      },
      ordersByStatus: statusRows,
      topDishes,
      paymentMethods: paymentRows,
      courierStats: courierRows,
      dailyRevenue,
    })
  } catch (err) {
    console.error('/api/admin/stats error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
