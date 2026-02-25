import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/db'
import { getBot } from '../lib/bot'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Verify CRON_SECRET
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.authorization ?? ''
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  try {
    const sql = getDb()
    const bot = getBot()
    const today = new Date().toISOString().slice(0, 10)

    // Get today's daily menu items
    const menuItems = await sql`
      SELECT m.name, m.description, m.price_kopecks, c.name AS category_name
      FROM daily_menu dm
      JOIN menu_items m ON dm.item_id = m.id
      JOIN categories c ON m.category_id = c.id
      WHERE dm.date = ${today}
      ORDER BY c.sort_order
    `

    if (!(menuItems as unknown[]).length) {
      console.log('No daily menu for', today)
      return res.status(200).json({ sent: 0, reason: 'No daily menu configured' })
    }

    // Get users subscribed to daily notifications
    const users = await sql`
      SELECT telegram_id AS "telegramId" FROM users
      WHERE notify_daily_menu = TRUE
    `

    if (!(users as unknown[]).length) {
      return res.status(200).json({ sent: 0, reason: 'No subscribers' })
    }

    // Format message
    const dayOfWeek = new Date().toLocaleDateString('ru-RU', { weekday: 'long' })
    const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

    let message = `🍽 <b>Меню на ${dayOfWeek}, ${dateStr}</b>\n\n`

    for (const item of menuItems as {
      name: string
      description: string | null
      price_kopecks: number
      category_name: string
    }[]) {
      const price = (item.price_kopecks / 100).toLocaleString('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
      })
      message += `• <b>${item.name}</b> — ${price}\n`
      if (item.description) {
        message += `  <i>${item.description}</i>\n`
      }
    }

    message += '\nПриятного аппетита! 🍴'

    // Send to all subscribers
    let sent = 0
    let errors = 0

    for (const user of users as { telegramId: number }[]) {
      try {
        await bot.api.sendMessage(user.telegramId, message, { parse_mode: 'HTML' })
        sent++
        // Small delay to avoid Telegram rate limits
        await new Promise((r) => setTimeout(r, 50))
      } catch (err) {
        errors++
        console.error(`Failed to send to ${user.telegramId}:`, err)
      }
    }

    console.log(`Daily menu sent: ${sent} ok, ${errors} errors`)
    return res.status(200).json({ sent, errors, date: today })
  } catch (err) {
    console.error('/api/cron/daily-menu error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
