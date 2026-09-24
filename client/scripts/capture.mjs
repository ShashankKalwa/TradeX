// Capture the TradeX surfaces for the inspection round.
// Login first, THEN navigate to the target route — otherwise the capture
// records the post-login landing page, not the page under inspection.
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = '../.impeccable/review'
mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:5173'

const browser = await chromium.launch()

async function signIn(page) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('input[type=email]', 'aditi.sharma@example.com')
  await page.fill('input[type=password]', 'password123')
  await page.click('button[type=submit]')
  await page.waitForURL(BASE + '/')
  await page.waitForTimeout(1500) // book load + feed hydrate
}

async function shoot(name, { viewport, mobile = false, path = '/login', authed = false, actions }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  if (authed) {
    await signIn(page)
    if (path !== '/') await page.goto(BASE + path, { waitUntil: 'networkidle' })
  } else {
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
  }
  await page.waitForTimeout(900)
  if (actions) await actions(page)
  await page.waitForTimeout(500)

  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: !mobile })
  await ctx.close()
  const real = errors.filter((e) => !/favicon|DevTools/i.test(e))
  console.log(`captured ${name}${real.length ? '  ⚠ ERRORS: ' + real.slice(0, 2).join(' | ') : ''}`)
}

// Public
await shoot('login-desktop', { viewport: { width: 1440, height: 900 } })
await shoot('login-mobile', { viewport: { width: 390, height: 844 }, mobile: true })

// Authenticated surfaces
await shoot('desktop-dashboard', { viewport: { width: 1440, height: 900 }, authed: true, path: '/' })
await shoot('desktop-markets', { viewport: { width: 1440, height: 900 }, authed: true, path: '/markets' })
await shoot('desktop-portfolio', { viewport: { width: 1440, height: 900 }, authed: true, path: '/portfolio' })
await shoot('desktop-orders', { viewport: { width: 1440, height: 900 }, authed: true, path: '/orders' })
await shoot('desktop-ledger', { viewport: { width: 1440, height: 900 }, authed: true, path: '/transactions' })
await shoot('desktop-watchlist', { viewport: { width: 1440, height: 900 }, authed: true, path: '/watchlist' })
await shoot('desktop-leaderboard', { viewport: { width: 1440, height: 900 }, authed: true, path: '/leaderboard' })

// Stock detail + the signature moment: file a market order and catch the stamp
await shoot('desktop-stock-trade', {
  viewport: { width: 1440, height: 900 },
  authed: true,
  path: '/stock/TCS',
  actions: async (page) => {
    await page.fill('input[aria-label="Quantity in shares"]', '3')
    await page.click('button[type=submit]')
    await page.waitForTimeout(900) // stamp mid-press
  }
})

// Rejection slip — try to SELL shares we do not hold
await shoot('desktop-rejection', {
  viewport: { width: 1440, height: 900 },
  authed: true,
  path: '/stock/WIPRO',
  actions: async (page) => {
    await page.click('button[aria-pressed="false"]:has-text("SELL")')
    await page.fill('input[aria-label="Quantity in shares"]', '5')
    await page.click('button[type=submit]')
    await page.waitForTimeout(1500)
  }
})

// Mobile
await shoot('mobile-dashboard', { viewport: { width: 390, height: 844 }, mobile: true, authed: true, path: '/' })
await shoot('mobile-markets', { viewport: { width: 390, height: 844 }, mobile: true, authed: true, path: '/markets' })
await shoot('mobile-stock', { viewport: { width: 390, height: 844 }, mobile: true, authed: true, path: '/stock/RELIANCE' })
await shoot('mobile-portfolio', { viewport: { width: 390, height: 844 }, mobile: true, authed: true, path: '/portfolio' })

await browser.close()
console.log('done')
