#!/usr/bin/env node
/**
 * Two-way p100 vs poster fill coverage (1 device px).
 * Expects vite preview at http://127.0.0.1:4173
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCssColor, twoWayFillCoverage, chipSeeThroughFromPath } from './k1-coverage-lib.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'test-results', 'hero-k1-coverage')
mkdirSync(outDir, { recursive: true })
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173'

const CFGS = [
  { w: 390, h: 844, dsf: 2, theme: 'light' },
  { w: 390, h: 844, dsf: 2, theme: 'dark' },
  { w: 1440, h: 900, dsf: 1, theme: 'light' },
  { w: 1440, h: 900, dsf: 1, theme: 'dark' },
]

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--disable-features=Vulkan',
    ],
  })
  const rows = []
  let failed = false

  for (const cfg of CFGS) {
    const context = await browser.newContext({
      viewport: { width: cfg.w, height: cfg.h },
      deviceScaleFactor: cfg.dsf,
      colorScheme: cfg.theme === 'dark' ? 'dark' : 'light',
    })
    const page = await context.newPage()
    await page.addInitScript((theme) => {
      try {
        localStorage.setItem('theme', theme)
        sessionStorage.removeItem('ob-3d-off')
      } catch {
        /* ignore */
      }
    }, cfg.theme)
    await page.goto(`${BASE}/?qa3d=1`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(
      () => Boolean(document.querySelector('.hero-3d')?.classList.contains('is-swapped') && window.__hero3d?.seek),
      null,
      { timeout: 30000 },
    )
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme
      document.documentElement.style.colorScheme = theme
      window.__hero3d.seek(1)
    }, cfg.theme)
    await page.waitForTimeout(80)

    const tokens = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement)
      const svg = document.querySelector('.hero-3d-poster')
      const chip = svg?.querySelector('path.k1-chip')
      const vb = (svg?.getAttribute('viewBox') || '0 0 320 240').trim().split(/\s+/)
      return {
        surface: css.getPropertyValue('--color-surface').trim(),
        ink: css.getPropertyValue('--color-ink').trim() || css.getPropertyValue('--color-foreground').trim(),
        chipD: chip?.getAttribute('d') || '',
        viewW: Number(vb[2]) || 320,
        viewH: Number(vb[3]) || 240,
      }
    })

    const show = async (live) => {
      await page.evaluate((on) => {
        const box = document.querySelector('.hero-3d')
        const canvas = box?.querySelector('canvas')
        const host = box?.querySelector('.hero-3d-poster-host')
        if (canvas) {
          canvas.style.opacity = on ? '1' : '0'
          canvas.style.visibility = on ? 'visible' : 'hidden'
          canvas.style.transitionDuration = '0ms'
        }
        if (host) {
          host.style.opacity = on ? '0' : '1'
          host.style.visibility = on ? 'hidden' : 'visible'
          host.style.transitionDuration = '0ms'
        }
      }, live)
      await page.waitForTimeout(40)
    }

    await show(true)
    const livePng = await page.locator('.hero-3d canvas').screenshot({
      animations: 'disabled',
      omitBackground: true,
    })
    await show(false)
    const posterPng = await page.locator('.hero-3d-poster').screenshot({
      animations: 'disabled',
      omitBackground: true,
    })

    const stem = `p100_vs_poster_${cfg.w}_${cfg.theme}`
    writeFileSync(path.join(outDir, `${stem}_live.png`), livePng)
    writeFileSync(path.join(outDir, `${stem}_poster.png`), posterPng)

    const cov = twoWayFillCoverage(
      Buffer.from(livePng),
      Buffer.from(posterPng),
      parseCssColor(tokens.surface),
      parseCssColor(tokens.ink),
      1,
    )
    const chip = chipSeeThroughFromPath(
      Buffer.from(livePng),
      tokens.chipD,
      tokens.viewW,
      tokens.viewH,
      parseCssColor(tokens.surface),
      2,
    )
    const ok = cov.aInB >= 0.99 && cov.bInA >= 0.99 && chip.seeThrough <= 4
    if (!ok) failed = true
    rows.push({
      viewport: `${cfg.w}@${cfg.dsf}x`,
      theme: cfg.theme,
      liveInPoster: Number((cov.aInB * 100).toFixed(2)),
      posterInLive: Number((cov.bInA * 100).toFixed(2)),
      chipSeeThrough: chip.seeThrough,
      chipInterior: chip.interior,
      aFill: cov.aFill,
      bFill: cov.bFill,
      size: `${cov.width}x${cov.height}`,
      ok,
    })
    await context.close()
  }

  await browser.close()
  writeFileSync(path.join(outDir, 'coverage.json'), `${JSON.stringify(rows, null, 2)}\n`)
  console.log(JSON.stringify(rows, null, 2))
  if (failed) {
    console.error('\nCoverage check failed.')
    process.exit(1)
  }
  console.log('\nCoverage check passed.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
