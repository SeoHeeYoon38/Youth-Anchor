import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const outputDir = new URL('../docs/screenshots/', import.meta.url)
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true
})

const cases = [
  { name: 'haven-welcome-small', path: '/', viewport: { width: 320, height: 568 } },
  { name: 'haven-home-small', path: '/home', viewport: { width: 320, height: 568 } },
  { name: 'haven-welcome-mobile', path: '/', viewport: { width: 390, height: 844 } },
  { name: 'haven-home-mobile', path: '/home', viewport: { width: 390, height: 844 } },
  { name: 'haven-shelters-mobile', path: '/shelters', viewport: { width: 390, height: 844 } },
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
  await page.goto(`http://127.0.0.1:5173${item.path}`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: fileURLToPath(new URL(`${item.name}.png`, outputDir)), fullPage: false })

  const overflows = await page.locator('body *').evaluateAll((elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element)
      if (element.classList.contains('sr-only')) return false
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
await interactionPage.goto('http://127.0.0.1:5173/home', { waitUntil: 'networkidle' })
await interactionPage.getByRole('button', { name: /SOS 대피처/ }).click()
await interactionPage.waitForURL('**/shelters')
await interactionPage.locator('.haven-map-marker').first().click()
await interactionPage.getByRole('dialog').waitFor()
await interactionPage.goto('http://127.0.0.1:5173/home', { waitUntil: 'networkidle' })
await interactionPage.getByRole('button', { name: /안전 가이드/ }).click()
await interactionPage.getByRole('dialog', { name: /가온의 안전 가이드/ }).waitFor()
await interactionPage.goto('http://127.0.0.1:5173/chat', { waitUntil: 'networkidle' })
await interactionPage.getByRole('button', { name: '그냥 이야기하고 싶어요' }).click()
await interactionPage.getByText('그냥 이야기하고 싶어요', { exact: true }).waitFor()
results.push({ name: 'interactions', passed: true })
await interactionPage.close()

await browser.close()
console.log(JSON.stringify(results, null, 2))
