import { expect, test } from '@playwright/test'
import fs from 'node:fs'
const catalog = JSON.parse(fs.readFileSync(new URL('./fixtures/catalog-approved.json', import.meta.url), 'utf8'))

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()
test('V1–V4: exact approved catalog, six cards, five amounts, no 3D', async ({ page }) => {
  await page.goto('/megrendeles/')
  await expect(page.locator('.mg-plan')).toHaveCount(6)
  for (const [i, card] of catalog.entries()) {
    const texts = [card.title, ...card.paragraphs]
    if (card.sub) texts.push(card.sub.title, ...card.sub.paragraphs)
    const expected = normalize(texts.join(' ').replace(/(^|\n)- /g, '$1'))
    expect(normalize(await page.locator('.mg-plan-body').nth(i).innerText())).toBe(expected)
  }
  const text = normalize(await page.locator('body').innerText())
  expect([...new Set([...text.matchAll(/\d{1,3}(?: \d{3})* Ft/g)].map(m => m[0]))].sort())
    .toEqual(['129 000 Ft','149 000 Ft','189 000 Ft','4 900 Ft','9 900 Ft'].sort())
  expect(text).not.toMatch(/Ft\/óra|3D termék|59 000/)
})

for (const width of [360,380,390,1023,1024,1440]) test(`Content-sized cards, reading order and no clipped email ${width}`, async ({page}) => {
  await page.setViewportSize({width,height:900}); await page.goto('/megrendeles/',{waitUntil:'networkidle'})
  const measurements=await page.evaluate(()=>{
    const box=(e:Element)=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}
    return {cards:[...document.querySelectorAll('.mg-plan')].map(e=>({
      ...box(e),cta:box(e.querySelector('.mg-plan-cta')!),terms:box(e.querySelector('.mg-plan-terms')!),
      padding:parseFloat(getComputedStyle(e).paddingBottom),
      content:box(e.querySelector('.mg-plan-content')!),
      margin:parseFloat(getComputedStyle(e.querySelector('.mg-plan-cta')!).marginTop),
    })), email:document.querySelector('#mg-email-text')!.scrollWidth <= document.querySelector('#mg-email-text')!.clientWidth,
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth}
  })
  expect(measurements.email).toBe(true);expect(measurements.overflow).toBe(false)
  for(const c of measurements.cards){expect(c.cta.h).toBe(48);expect(c.margin).toBeGreaterThanOrEqual(16)}
  for (const c of measurements.cards) {
    // The CTA follows its own terms instead of a taller neighbouring card.
    expect(Math.abs(c.cta.y - (c.terms.y + c.terms.h) - c.margin)).toBeLessThanOrEqual(1)
    expect(Math.abs(c.y + c.h - (c.cta.y + c.cta.h) - c.padding)).toBeLessThanOrEqual(1)
    expect(Math.abs(c.terms.y - (c.content.y + c.content.h) - 16)).toBeLessThanOrEqual(1)
  }
  const columns = [...new Set(measurements.cards.map(c => c.x))]
  expect(columns).toHaveLength(width < 1024 ? 1 : 2)
  for (const x of columns) {
    const column = measurements.cards.filter(c => c.x === x)
    for (let i = 1; i < column.length; i++) {
      expect(Math.abs(column[i].y - column[i-1].y - column[i-1].h - 24)).toBeLessThanOrEqual(1)
    }
  }
  if([360,390,1024,1440].includes(width)) await page.screenshot({path:`test-results/catalog-${width}.png`,fullPage:true})
})

test('catalog frame draw 900ms; reduced motion none',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/megrendeles/')
  expect(await page.locator('.mg-plan-stroke').evaluateAll(es=>es.map(e=>getComputedStyle(e).animationDuration))).toEqual(Array(6).fill('0.9s'))
  expect(await page.locator('.mg-plan-stroke').evaluateAll(es=>es.map(e=>getComputedStyle(e).animationDelay))).toEqual(Array(6).fill('0s'))
  await page.emulateMedia({reducedMotion:'reduce'})
  expect(await page.locator('.mg-plan-stroke').evaluateAll(es=>es.map(e=>getComputedStyle(e).animationName))).toEqual(Array(6).fill('none'))
})
