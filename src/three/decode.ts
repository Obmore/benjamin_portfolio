import type { Quantized } from './types'

export function decodeLines(q: Quantized): Float32Array {
  const bin = atob(q.p)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const src = new Int16Array(bytes.buffer)
  const out = new Float32Array(src.length)
  const ox = q.o[0]
  const oy = q.o[1]
  const oz = q.o[2]
  const s = q.s
  for (let i = 0; i < src.length; i += 3) {
    out[i] = src[i] * s + ox
    out[i + 1] = src[i + 1] * s + oy
    out[i + 2] = src[i + 2] * s + oz
  }
  return out
}
