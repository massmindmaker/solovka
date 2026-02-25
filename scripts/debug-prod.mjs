// Playwright diagnostic: open production site, capture network + console errors
import { chromium } from 'playwright'

const URL = 'https://solovka-eight.vercel.app'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  viewport: { width: 390, height: 844 },
  // Simulate Telegram WebApp environment
  extraHTTPHeaders: {
    'Accept-Language': 'ru-RU,ru;q=0.9',
  },
})

const page = await context.newPage()

const networkLog = []
const consoleLog = []
const errors = []

// Intercept all requests
page.on('request', req => {
  if (req.url().includes('/api/')) {
    networkLog.push({ type: 'REQ', method: req.method(), url: req.url(), headers: req.headers() })
  }
})

page.on('response', async resp => {
  if (resp.url().includes('/api/')) {
    let body = ''
    try { body = await resp.text() } catch {}
    networkLog.push({ type: 'RES', status: resp.status(), url: resp.url(), body: body.slice(0, 500) })
  }
})

// Intercept console
page.on('console', msg => {
  consoleLog.push({ type: msg.type(), text: msg.text() })
})

page.on('pageerror', err => {
  errors.push(err.message)
})

console.log(`Opening ${URL} ...`)
await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })

// Wait extra for React to render
await page.waitForTimeout(3000)

// Screenshot
await page.screenshot({ path: 'scripts/screenshot-prod.png', fullPage: true })
console.log('Screenshot saved: scripts/screenshot-prod.png')

// Read DOM state
const domState = await page.evaluate(() => {
  return {
    title: document.title,
    bodyText: document.body?.innerText?.slice(0, 1000),
    hasTgObject: typeof window.Telegram !== 'undefined',
    tgWebApp: typeof window.Telegram?.WebApp !== 'undefined',
    // Check for key elements
    categoryTabs: document.querySelectorAll('[data-slug]').length,
    menuCards: document.querySelectorAll('.grid > div').length,
    spinners: document.querySelectorAll('[class*="spinner"], [class*="Spinner"]').length,
  }
})

console.log('\n=== DOM STATE ===')
console.log(JSON.stringify(domState, null, 2))

console.log('\n=== NETWORK (API calls) ===')
for (const entry of networkLog) {
  if (entry.type === 'REQ') {
    console.log(`→ ${entry.method} ${entry.url}`)
    if (entry.headers?.authorization) console.log(`  Authorization: ${entry.headers.authorization.slice(0, 60)}...`)
  } else {
    console.log(`← ${entry.status} ${entry.url}`)
    if (entry.body) console.log(`  Body: ${entry.body.slice(0, 300)}`)
  }
}

console.log('\n=== CONSOLE LOGS ===')
for (const log of consoleLog) {
  console.log(`[${log.type}] ${log.text}`)
}

console.log('\n=== JS ERRORS ===')
for (const err of errors) {
  console.log(`ERROR: ${err}`)
}

// Now inject fake Telegram WebApp and retry
console.log('\n\n=== RETRY WITH FAKE TELEGRAM WEBAPP ===')
const page2 = await context.newPage()
const networkLog2 = []

page2.on('response', async resp => {
  if (resp.url().includes('/api/')) {
    let body = ''
    try { body = await resp.text() } catch {}
    networkLog2.push({ status: resp.status(), url: resp.url(), body: body.slice(0, 800) })
  }
})

page2.on('console', msg => {
  if (msg.type() === 'error') console.log(`[console.error] ${msg.text()}`)
})

// Inject window.Telegram BEFORE page load
await page2.addInitScript(() => {
  window.Telegram = {
    WebApp: {
      ready: () => {},
      expand: () => {},
      close: () => {},
      initData: 'query_id=test&user=%7B%22id%22%3A123456%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22testuser%22%2C%22language_code%22%3A%22ru%22%7D&auth_date=1708000000&hash=fakehash',
      initDataUnsafe: {
        query_id: 'test',
        user: { id: 123456, first_name: 'Test', last_name: 'User', username: 'testuser', language_code: 'ru' },
        auth_date: 1708000000,
        hash: 'fakehash',
      },
      colorScheme: 'light',
      themeParams: {
        bg_color: '#ffffff',
        text_color: '#000000',
        hint_color: '#999999',
        link_color: '#2481cc',
        button_color: '#2481cc',
        button_text_color: '#ffffff',
        secondary_bg_color: '#f1f1f1',
      },
      isExpanded: true,
      viewportHeight: 844,
      viewportStableHeight: 844,
      MainButton: {
        text: '',
        color: '#2481cc',
        textColor: '#ffffff',
        isVisible: false,
        isActive: true,
        setText: function(t) { this.text = t; return this },
        onClick: function(fn) { this._fn = fn; return this },
        offClick: function() { return this },
        show: function() { this.isVisible = true; return this },
        hide: function() { this.isVisible = false; return this },
        enable: function() { return this },
        disable: function() { return this },
      },
      BackButton: {
        isVisible: false,
        onClick: function() { return this },
        offClick: function() { return this },
        show: function() { this.isVisible = true; return this },
        hide: function() { this.isVisible = false; return this },
      },
      HapticFeedback: {
        impactOccurred: () => {},
        notificationOccurred: () => {},
        selectionChanged: () => {},
      },
      platform: 'android',
      version: '6.9',
    }
  }
})

await page2.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
await page2.waitForTimeout(4000)

await page2.screenshot({ path: 'scripts/screenshot-with-tg.png', fullPage: true })
console.log('Screenshot saved: scripts/screenshot-with-tg.png')

const domState2 = await page2.evaluate(() => ({
  bodyText: document.body?.innerText?.slice(0, 800),
  categoryTabs: document.querySelectorAll('[data-slug]').length,
  menuCards: document.querySelectorAll('.grid > div').length,
}))

console.log('\nDOM state (with fake TG):')
console.log(JSON.stringify(domState2, null, 2))

console.log('\nAPI calls (with fake TG):')
for (const r of networkLog2) {
  console.log(`← ${r.status} ${r.url}`)
  console.log(`  ${r.body.slice(0, 400)}`)
}

await browser.close()
