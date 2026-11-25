import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const outputDir = new URL(`../docs/screenshots/visual-check-${Date.now()}/`, import.meta.url)
const appUrl = process.env.APP_URL || 'http://localhost:5173'
await mkdir(outputDir, { recursive: true })

// 실행 환경마다 크롬 위치가 달라 경로를 하드코딩하지 않는다.
// CHROME_PATH가 있으면 그 브라우저를, 없으면 Playwright가 내려받은 브라우저를 쓴다.
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  headless: true,
  args: ['--no-sandbox']
})

const cases = [
  { name: 'haven-welcome-small', path: '/', viewport: { width: 320, height: 568 } },
  { name: 'haven-home-small', path: '/home', viewport: { width: 320, height: 568 } },
  { name: 'haven-welcome-mobile', path: '/', viewport: { width: 390, height: 844 } },
  { name: 'haven-home-mobile', path: '/home', viewport: { width: 390, height: 844 } },
  { name: 'haven-shelters-mobile', path: '/shelters', viewport: { width: 390, height: 844 } },
  { name: 'haven-family-help-mobile', path: '/family-help', viewport: { width: 390, height: 844 } },
  { name: 'haven-chat-mobile', path: '/chat', viewport: { width: 390, height: 844 } },
  { name: 'haven-support-mobile', path: '/support', viewport: { width: 390, height: 844 } },
  { name: 'haven-home-desktop', path: '/home', viewport: { width: 1100, height: 900 } }
]

const results = []
for (const item of cases) {
  const page = await browser.newPage({ viewport: item.viewport, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${appUrl}${item.path}`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: fileURLToPath(new URL(`${item.name}.png`, outputDir)), fullPage: false })

  const overflows = await page.locator('body *').evaluateAll((elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element)
      if (element.classList.contains('sr-only')) return false
      if (element.closest('.kakao-map')) return false
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') return false
      return element.scrollWidth > element.clientWidth + 2 && element.clientWidth > 0
    })
    .slice(0, 12)
    .map((element) => ({
      tag: element.tagName,
      className: element.className,
      text: element.textContent?.trim().slice(0, 80),
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth
    })))

  results.push({ ...item, errors, overflows })
  await page.close()
}

const interactionPage = await browser.newPage({ viewport: { width: 390, height: 844 } })
await interactionPage.goto(`${appUrl}/home`, { waitUntil: 'networkidle' })
assert.deepEqual(await interactionPage.locator('.feature-tile strong').allTextContents(), ['지원', '법률 상담', '일기장', '안전 가이드'])
await interactionPage.getByRole('button', { name: /지도에서 모두 보기/ }).click()
await interactionPage.waitForURL('**/shelters')
const jobs = interactionPage.getByRole('link', { name: '일자리를 찾아봐요', exact: true })
assert.match(await jobs.getAttribute('href'), /^https:\/\/www\.work24\.go\.kr\/wk\/a\/b\/1200\//)
await interactionPage.getByRole('link', { name: '채팅', exact: true }).click()
await interactionPage.waitForURL('**/chat')
await interactionPage.goto(`${appUrl}/shelters`, { waitUntil: 'networkidle' })
await interactionPage.locator('.haven-map-marker').first().click()
await interactionPage.getByRole('dialog').waitFor()
await interactionPage.keyboard.press('Escape')
await interactionPage.goto(`${appUrl}/home`, { waitUntil: 'networkidle' })
await interactionPage.getByRole('button', { name: /안전 가이드/ }).click()
await interactionPage.getByRole('dialog', { name: /HAVEN의 안전 가이드/ }).waitFor()
await interactionPage.goto(`${appUrl}/support`, { waitUntil: 'networkidle' })
await interactionPage.getByRole('tab', { name: '식사' }).click()
await interactionPage.getByText('식사 지원', { exact: true }).waitFor()
await interactionPage.getByText(/학교우유급식|농식품바우처|청소년방과후아카데미운영지원/).first().waitFor()
await interactionPage.goto(`${appUrl}/home`, { waitUntil: 'networkidle' })
await interactionPage.getByRole('button', { name: '일자리 찾기 닫기' }).click()
await jobs.waitFor({ state: 'detached' })
await interactionPage.goto(`${appUrl}/chat`, { waitUntil: 'networkidle' })
await interactionPage.getByRole('button', { name: '그냥 이야기하고 싶어요' }).click()
await interactionPage.getByText('그냥 이야기하고 싶어요', { exact: true }).waitFor()
results.push({ name: 'interactions', passed: true })
await interactionPage.close()

await browser.close()
console.log(JSON.stringify(results, null, 2))
