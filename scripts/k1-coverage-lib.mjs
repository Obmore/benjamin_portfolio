import { inflateSync } from 'node:zlib'

export function parseCssColor(value) {
  const trim = String(value ?? '').trim()
  if (trim.startsWith('#')) {
    const body =
      trim.length === 4 ? [...trim.slice(1)].map((ch) => ch + ch).join('') : trim.slice(1)
    const n = Number.parseInt(body, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const match = trim.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return [255, 255, 255]
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

export function decodePngRgba(png) {
  if (png.subarray(1, 4).toString('ascii') !== 'PNG') throw new Error('not png')
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const chunks = []
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      chunks.push(Buffer.from(data))
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported png ${bitDepth}/${colorType}`)
  }
  const bpp = colorType === 6 ? 4 : 3
  const stride = width * bpp
  const inflated = inflateSync(Buffer.concat(chunks))
  const pixels = Buffer.alloc(width * height * 4)
  let src = 0
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[src]
    src += 1
    const row = Buffer.alloc(stride)
    const raw = inflated.subarray(src, src + stride)
    src += stride
    for (let i = 0; i < stride; i += 1) {
      const left = i >= bpp ? row[i - bpp] : 0
      const up = prev[i]
      const upLeft = i >= bpp ? prev[i - bpp] : 0
      const x = raw[i]
      if (filter === 0) row[i] = x
      else if (filter === 1) row[i] = (x + left) & 255
      else if (filter === 2) row[i] = (x + up) & 255
      else if (filter === 3) row[i] = (x + ((left + up) >> 1)) & 255
      else if (filter === 4) row[i] = (x + paeth(left, up, upLeft)) & 255
      else throw new Error(`bad filter ${filter}`)
    }
    for (let x = 0; x < width; x += 1) {
      const si = x * bpp
      const di = (y * width + x) * 4
      pixels[di] = row[si]
      pixels[di + 1] = row[si + 1]
      pixels[di + 2] = row[si + 2]
      pixels[di + 3] = bpp === 4 ? row[si + 3] : 255
    }
    prev = row
  }
  return { width, height, pixels }
}

function maxDelta(pixels, i, rgb) {
  return Math.max(
    Math.abs(pixels[i] - rgb[0]),
    Math.abs(pixels[i + 1] - rgb[1]),
    Math.abs(pixels[i + 2] - rgb[2]),
  )
}

export function fillMask(img, surfaceRgb, colorTol = 28, minAlpha = 200) {
  const { width, height, pixels } = img
  const mask = new Uint8Array(width * height)
  let count = 0
  for (let i = 0, p = 0; i < mask.length; i += 1, p += 4) {
    if (pixels[p + 3] < minAlpha) continue
    if (maxDelta(pixels, p, surfaceRgb) > colorTol) continue
    mask[i] = 1
    count += 1
  }
  return { mask, count, width, height }
}

function coveredBy(src, dst, radius) {
  const { mask: a, count, width, height } = src
  const { mask: b } = dst
  if (count === 0) return 1
  let hit = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x
      if (!a[i]) continue
      let ok = false
      const y0 = Math.max(0, y - radius)
      const y1 = Math.min(height - 1, y + radius)
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(width - 1, x + radius)
      for (let yy = y0; yy <= y1 && !ok; yy += 1) {
        for (let xx = x0; xx <= x1; xx += 1) {
          if (b[yy * width + xx]) ok = true
        }
      }
      if (ok) hit += 1
    }
  }
  return hit / count
}

function erode(src, radius) {
  const { mask, width, height } = src
  const out = new Uint8Array(mask.length)
  let count = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x
      if (!mask[i]) continue
      let keep = true
      const y0 = Math.max(0, y - radius)
      const y1 = Math.min(height - 1, y + radius)
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(width - 1, x + radius)
      for (let yy = y0; yy <= y1 && keep; yy += 1) {
        for (let xx = x0; xx <= x1; xx += 1) {
          if (!mask[yy * width + xx]) keep = false
        }
      }
      if (keep) {
        out[i] = 1
        count += 1
      }
    }
  }
  return { mask: out, count, width, height }
}

export function convexHull(points) {
  const uniq = []
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  for (const p of sorted) {
    const last = uniq[uniq.length - 1]
    if (last && last.x === p.x && last.y === p.y) continue
    uniq.push(p)
  }
  if (uniq.length <= 2) return uniq
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower = []
  for (const p of uniq) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper = []
  for (let i = uniq.length - 1; i >= 0; i -= 1) {
    const p = uniq[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

function pointInPoly(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi
    if (hit) inside = !inside
  }
  return inside
}

export function chipSeeThrough(liveBuf, pinPts, surfaceRgb, inkRgb, erodePx = 2) {
  const img = decodePngRgba(liveBuf)
  const hull = convexHull(pinPts)
  if (hull.length < 3) {
    return { seeThrough: 9999, interior: 0, pins: pinPts.length, hull: hull.length }
  }
  const mask = new Uint8Array(img.width * img.height)
  let count = 0
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (!pointInPoly(x + 0.5, y + 0.5, hull)) continue
      mask[y * img.width + x] = 1
      count += 1
    }
  }
  const interior = erode({ mask, count, width: img.width, height: img.height }, erodePx)
  let seeThrough = 0
  for (let i = 0; i < interior.mask.length; i += 1) {
    if (!interior.mask[i]) continue
    const p = i * 4
    const a = img.pixels[p + 3]
    if (a < 160) {
      seeThrough += 1
      continue
    }
    if (maxDelta(img.pixels, p, surfaceRgb) > 28) seeThrough += 1
  }
  return { seeThrough, interior: interior.count, pins: pinPts.length, hull: hull.length }
}

export function twoWayFillCoverage(aBuf, bBuf, surfaceRgb, inkRgb, radius = 1) {
  const a = decodePngRgba(aBuf)
  const b = decodePngRgba(bBuf)
  const w = Math.min(a.width, b.width)
  const h = Math.min(a.height, b.height)
  if (a.width !== b.width || a.height !== b.height) {
    const clipA = { width: w, height: h, pixels: Buffer.alloc(w * h * 4) }
    const clipB = { width: w, height: h, pixels: Buffer.alloc(w * h * 4) }
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const di = (y * w + x) * 4
        const ai = (y * a.width + x) * 4
        const bi = (y * b.width + x) * 4
        clipA.pixels.set(a.pixels.subarray(ai, ai + 4), di)
        clipB.pixels.set(b.pixels.subarray(bi, bi + 4), di)
      }
    }
    return twoWayFillCoverageFromImages(clipA, clipB, surfaceRgb, inkRgb, radius)
  }
  return twoWayFillCoverageFromImages(a, b, surfaceRgb, inkRgb, radius)
}

function twoWayFillCoverageFromImages(a, b, surfaceRgb, inkRgb, radius) {
  const aFill = fillMask(a, surfaceRgb)
  const bFill = fillMask(b, surfaceRgb)
  const aInB = coveredBy(aFill, bFill, radius)
  const bInA = coveredBy(bFill, aFill, radius)
  const interior = erode(bFill, 4)
  let inkInside = 0
  for (let i = 0; i < interior.mask.length; i += 1) {
    if (!interior.mask[i]) continue
    const p = i * 4
    if (a.pixels[p + 3] < 160) {
      inkInside += 1
      continue
    }
    if (maxDelta(a.pixels, p, inkRgb) <= 40 && maxDelta(a.pixels, p, surfaceRgb) > 28) {
      inkInside += 1
    }
  }
  return {
    aInB,
    bInA,
    aFill: aFill.count,
    bFill: bFill.count,
    interior: interior.count,
    inkInside,
    width: a.width,
    height: a.height,
  }
}
