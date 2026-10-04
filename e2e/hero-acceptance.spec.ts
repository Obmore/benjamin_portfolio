import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { OrthographicCamera, Vector3 } from 'three'
import * as L from '../src/three/k1-layout'
import { prepareDesktop3d, gotoDesktop, waitLive, seekProgress, screenshotCanvas,
  screenshotPoster, twoWayInk, decodePngRgba, inkMask, maxDelta } from './hero-helpers'

function project(x: number, y: number, z: number, width: number, height: number) {
  const c = new OrthographicCamera(-L.FRUSTUM * width / height, L.FRUSTUM * width / height, L.FRUSTUM, -L.FRUSTUM, .1, 40)
  const el = L.CAM_ELEV * Math.PI / 180, az = L.CAM_AZIM * Math.PI / 180
  c.position.set(L.CAM_DIST * Math.cos(el) * Math.sin(az), L.CAM_DIST * Math.sin(el), L.CAM_DIST * Math.cos(el) * Math.cos(az))
  c.lookAt(0, 0, 0); c.updateMatrixWorld()
  const v = new Vector3(x, y, z).project(c)
  return { x: (v.x + 1) * width / 2, y: (1 - v.y) * height / 2 }
}

for (const dpr of [1, 2]) test(`B1 real coverage DPR ${dpr}`, async ({ browser }, info) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr })
  await prepareDesktop3d(page, browser); await gotoDesktop(page); await waitLive(page)
  const canvas = await screenshotCanvas(page), poster = await screenshotPoster(page)
  const cov = twoWayInk(canvas, poster, 1)
  await info.attach('coverage', { body: JSON.stringify(cov), contentType: 'application/json' })
  console.log('B1', dpr, cov)
  expect(cov.aCount).toBeGreaterThan(100); expect(cov.bCount).toBeGreaterThan(100)
  expect(cov.aInB).toBeGreaterThanOrEqual(.98); expect(cov.bInA).toBeGreaterThanOrEqual(.98)
  expect(cov.bboxDelta).toBeLessThanOrEqual(.01)
  await page.close()
})

test('B2/B3 all contour samples, visible pins and 28 route endpoints at p100', async ({ page, browser }, info) => {
  await prepareDesktop3d(page, browser); await gotoDesktop(page); await waitLive(page)
  for (const p of [.4, .6, 1]) {
    await seekProgress(page, p)
    const png = await screenshotCanvas(page), img = decodePngRgba(png)
    await info.attach(`p${p * 100}`, { body: png, contentType: 'image/png' })
    let accent = 0
    for (let i = 0; i < img.pixels.length; i += 4) if (img.pixels[i + 3] >= 40 && maxDelta(img.pixels, i, [30, 58, 95]) <= 28) accent++
    if (p === .4) expect(accent).toBe(0); else expect(accent).toBeGreaterThan(0)
    if (p !== 1) continue
    const ink = inkMask(img, [123,127,138], [30,58,95], [255,255,255])
    const hit = (x: number, y: number, radius = 2) => {
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        const px = Math.round(x) + dx, py = Math.round(y) + dy
        if (px >= 0 && px < img.width && py >= 0 && py < img.height && ink.mask[py * img.width + px]) return true
      }
      return false
    }
    const ys = L.poseYs(1)
    const ends = L.traceEnds()
    expect(ends).toHaveLength(28)
    const missing = ends.filter(e => {
      const pt = project(e.x, e.layer === 'top' ? ys.top + L.TOP_Y : ys.bot + L.BOT_Y, e.z, img.width, img.height)
      return !hit(pt.x, pt.y)
    })
    expect(missing, 'Every endpoint must contribute pixels').toEqual([])
    const pins = L.chipPins().filter(pin => pin.id.startsWith('pin-R') || pin.id.startsWith('pin-T'))
    expect(pins).toHaveLength(10)
    for (const pin of pins) {
      const pt = project(pin.x, ys.chip + L.CHIP_Y - .04, pin.z, img.width, img.height)
      expect(hit(pt.x, pt.y), pin.id).toBe(true)
    }
    for (const [a,b] of L.topFaceEdges(L.CHIP,.1,L.CHIP,0,ys.chip + L.CHIP_Y,0)) {
      const start = project(...a,img.width,img.height), end = project(...b,img.width,img.height)
      const length = Math.ceil(Math.hypot(start.x - end.x,start.y - end.y))
      let gap = 0
      for (let i=0;i<=length;i++) {
        const t=i/length
        gap = hit(start.x + (end.x-start.x)*t,start.y+(end.y-start.y)*t,1) ? 0 : gap+1
        expect(gap,'chip contour gap').toBeLessThanOrEqual(2)
      }
    }
  }
})

test('B8 p100 vs immutable PR18 SVG, DPR2, radius2 >=98% both ways', async ({ browser }, info) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  await prepareDesktop3d(page,browser); await gotoDesktop(page); await waitLive(page); await seekProgress(page,1)
  const png = await screenshotCanvas(page), decoded = decodePngRgba(png)
  const html = execFileSync('git',['show','b33c9d88498899e8806fec1d89653f181166d849:index.html'],{ encoding:'utf8' })
  const svg = html.match(/<template id="hero-k1-poster-template">([\s\S]*?)<\/template>/)?.[1]
  expect(svg).toBeTruthy()
  const ref = await browser.newPage({ viewport:{ width:1440,height:900 },deviceScaleFactor:2,reducedMotion:'reduce' })
  await ref.setContent(`<style>html,body{margin:0;background:white;--color-ink:#0f172a;--color-accent:#1e3a5f;--color-surface:#fff}svg{display:block;width:${decoded.width/2}px;height:${decoded.height/2}px}</style>${svg}`)
  const reference = await ref.locator('svg').screenshot()
  const cov = twoWayInk(reference,png,2)
  console.log('B8',cov)
  await info.attach('reference', {body:reference,contentType:'image/png'})
  await info.attach('p100', {body:png,contentType:'image/png'})
  await info.attach('coverage', {body:JSON.stringify(cov),contentType:'application/json'})
  fs.mkdirSync('test-results/acceptance',{recursive:true})
  fs.writeFileSync('test-results/acceptance/b8-reference.png',reference)
  fs.writeFileSync('test-results/acceptance/b8-p100.png',png)
  expect(cov.aCount).toBeGreaterThan(100);expect(cov.bCount).toBeGreaterThan(100)
  expect(cov.aInB).toBeGreaterThanOrEqual(.98);expect(cov.bInA).toBeGreaterThanOrEqual(.98)
  await page.close(); await ref.close()
})

test('B4 CPU x4, three cold boots, no boot task >120ms', async ({ browser }) => {
  for (let i=0;i<3;i++) {
    const page = await browser.newPage({viewport:{width:1440,height:900}})
    await prepareDesktop3d(page,browser)
    const cdp=await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
    await page.addInitScript(() => {
      const w=window as unknown as {tasks:PerformanceEntry[]}
      w.tasks=[]
      new PerformanceObserver(list=>w.tasks.push(...list.getEntries().map(e=>e.toJSON()))).observe({type:'longtask',buffered:true})
    })
    await gotoDesktop(page);await waitLive(page)
    const tasks=await page.evaluate(()=> {
      const first=performance.getEntriesByType('resource').find(e=>/hero3d-boot/.test(e.name))?.startTime ?? 0
      return (window as unknown as {tasks:PerformanceEntry[]}).tasks.filter(e=>e.startTime>=first)
    })
    console.log('B4',i,tasks.map(t=>t.duration))
    expect(tasks.filter(t=>t.duration>120)).toEqual([])
    await page.close()
  }
})
