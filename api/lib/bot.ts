import { Bot } from 'grammy'

// Create a lightweight Bot instance for sending messages only
// (no polling, no webhook handling — we use it imperatively)
let _bot: Bot | null = null

export function getBot(): Bot {
  const token = process.env.BOT_TOKEN
  if (!token || token === 'dev') {
    // Return a no-op stub in dev / missing token
    return {
      api: {
        sendMessage: async (...args: unknown[]) => {
          console.log('[Bot mock] sendMessage', ...args)
          return {}
        },
      },
    } as unknown as Bot
  }
  if (!_bot) {
    _bot = new Bot(token)
  }
  return _bot
}

// ─── Notification helpers ─────────────────────────────────

export async function notifyUser(telegramId: number, text: string): Promise<void> {
  const bot = getBot()
  try {
    await bot.api.sendMessage(telegramId, text, { parse_mode: 'HTML' })
  } catch (err) {
    console.error(`Failed to notify user ${telegramId}:`, err)
  }
}

export async function notifyAdmin(text: string): Promise<void> {
  const adminId = process.env.ADMIN_CHAT_ID
  if (!adminId) return
  const bot = getBot()
  try {
    await bot.api.sendMessage(Number(adminId), text, { parse_mode: 'HTML' })
  } catch (err) {
    console.error('Failed to notify admin:', err)
  }
}

// ─── Formatters ───────────────────────────────────────────

export function formatOrderNotification(
  orderId: number,
  items: { itemName: string; quantity: number }[],
  totalKopecks: number,
  deliveryRoom: string,
  deliveryTime: string,
): string {
  const itemLines = items
    .map((i) => `  • ${i.itemName}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`)
    .join('\n')

  const total = (totalKopecks / 100).toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  return [
    `✅ <b>Заказ #${orderId} принят!</b>`,
    '',
    itemLines,
    '',
    `💰 Итого: ${total}`,
    `📍 Доставка: ${deliveryRoom}`,
    `🕐 Время: ${deliveryTime}`,
  ].join('\n')
}
