import { expect, test } from '@playwright/test'

for (const width of [360,390,1024,1440]) test(`light-only, full domain labels, fixed strokes ${width}`,async({page})=>{
  await page.emulateMedia({colorScheme:'dark'})
  await page.addInitScript(()=>localStorage.setItem('theme','dark'))
  await page.setViewportSize({width,height:900});await page.goto('/',{waitUntil:'networkidle'})
  await expect(page.getByRole('button',{name:/Sötét mód|Dark mode/})).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-theme','dark')
  expect(await page.locator('html').evaluate(e=>getComputedStyle(e).colorScheme)).toBe('light')
  const clipped=await page.locator('.work-shot-domain').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).map(e=>e.textContent))
  expect(clipped).toEqual([])
  const labelPadding = await page.locator('.work-shot-chrome').evaluateAll(es => es.map(e => {
    const style = getComputedStyle(e)
    return Math.min(parseFloat(style.paddingTop), parseFloat(style.paddingBottom))
  }))
  for (const padding of labelPadding) expect(padding).toBeGreaterThanOrEqual(6)
  expect(await page.locator('.work-shot').evaluateAll(es=>[...new Set(es.map(e=>getComputedStyle(e).marginBottom))])).toEqual(['24px'])
  const missing=await page.locator('svg path,svg line,svg rect,svg circle,svg polyline,svg polygon').evaluateAll(es=>es.filter(e=>{
    const cs=getComputedStyle(e)
    return cs.stroke!=='none'&&cs.vectorEffect!=='non-scaling-stroke'
  }).map(e=>e.outerHTML))
  expect(missing).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
})

test('active work marker follows selected row after resizing',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/#munkaim',{waitUntil:'networkidle'})
  const links=page.locator('.work-index-link'), count=await links.count()
  await links.nth(count-1).click()
  await expect(links.nth(count-1)).toHaveAttribute('aria-current','location')
  for(const width of [1024,1440]){
    await page.setViewportSize({width,height:900})
    await expect.poll(()=>page.locator('.work-index-list').evaluate(e=>{
      const row=e.querySelector<HTMLElement>('[data-active="true"]')!
      const style=getComputedStyle(e)
      return Math.max(Math.abs(parseFloat(style.getPropertyValue('--active-y'))-row.offsetTop),Math.abs(parseFloat(style.getPropertyValue('--active-h'))-row.offsetHeight))
    })).toBeLessThanOrEqual(1)
  }
})
