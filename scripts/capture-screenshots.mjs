/**
 * Full-window Marketplace screenshots (1920x1080).
 * Usage: node scripts/capture-screenshots.mjs [baseUrl]
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'docs/screenshots')
const baseUrl = process.argv[2] || 'http://localhost:5174'

const VIEWPORT = { width: 1920, height: 1080 }

async function settle(page, ms = 800) {
  await page.waitForTimeout(ms)
}

async function shot(page, name) {
  const path = join(outDir, `${name}.png`)
  await page.screenshot({ path, fullPage: false, type: 'png' })
  console.log('wrote', path)
}

/** Capra SelectField: button trigger + listbox option. */
async function pickSelectOption(page, triggerName, optionName) {
  const trigger = page.getByRole('button', { name: triggerName }).first()
  await trigger.click()
  await page.getByRole('option', { name: optionName }).click()
  await settle(page, 400)
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  })

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'overview')

  // Storm scenario via Capra SelectField
  await pickSelectOption(page, /Scenario|Normal/i, 'Storm + Outage')
  await settle(page)
  await shot(page, 'overview-storm')

  // Open investigation drawer from a critical incident
  const critical = page.locator('button.overview-incident').filter({ hasText: 'Critical' }).first()
  if (await critical.count()) {
    await critical.click()
    await settle(page, 1000)
    await shot(page, 'investigation-drawer')
    const close = page.getByRole('button', { name: /Close drawer/i })
    if (await close.count()) await close.click()
    await settle(page, 400)
  }

  await page.goto(`${baseUrl}/enclosures`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'enclosures')

  await page.goto(`${baseUrl}/compatibility`, { waitUntil: 'networkidle' })
  await settle(page)
  try {
    await pickSelectOption(page, /Select animal|Animal/i, /Blue/)
    await pickSelectOption(page, /Select animal|Animal/i, /Charlie/)
    await pickSelectOption(page, /Select enclosure|Target enclosure|enclosure/i, /Raptor Containment/)
  } catch (e) {
    console.warn('compatibility selects skipped:', e.message)
  }
  await settle(page)
  await shot(page, 'compatibility')

  await page.goto(`${baseUrl}/fleet`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'fleet')

  await page.goto(`${baseUrl}/lab`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'lab')

  await page.goto(`${baseUrl}/services`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'services')

  await browser.close()
  console.log('done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
