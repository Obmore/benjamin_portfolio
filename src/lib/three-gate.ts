type NavMem = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

const WATCHDOG_KEY = 'ob-3d-off'

export type Hero3dTier = 'static' | 'lite' | 'full'

type GlProbe = { ok: boolean; software: boolean }
let glProbe: GlProbe | null = null

// Adapted from mrdoob/three.js examples/jsm/capabilities/WebGL.js @ 0.186.1
// https://github.com/mrdoob/three.js/blob/r186/examples/jsm/capabilities/WebGL.js
// Copyright (c) 2010-2026 three.js authors — SPDX: MIT
// Changes: exported as hasWebGL(); WebGL2 only; no error-message helper
function probeWebGL(): GlProbe {
  if (glProbe) return glProbe
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    if (!gl) {
      glProbe = { ok: false, software: false }
      return glProbe
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    glProbe = {
      ok: true,
      software: /swiftshader|llvmpipe|software/i.test(renderer),
    }
    return glProbe
  } catch {
    glProbe = { ok: false, software: false }
    return glProbe
  }
}

export function hasWebGL(): boolean {
  return probeWebGL().ok
}

export function isSoftwareGL(): boolean {
  return probeWebGL().software
}

export function hero3dWidthTier(): 'lite' | 'full' {
  if (window.matchMedia('(max-width: 768px), (pointer: coarse)').matches) return 'lite'
  return 'full'
}

export function isQa3d(): boolean {
  return new URLSearchParams(location.search).get('qa3d') === '1'
}

export function mark3dWatchdog() {
  try {
    sessionStorage.setItem(WATCHDOG_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function hero3dTier(): Hero3dTier {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static'
  const n = navigator as NavMem
  if (n.connection?.saveData) return 'static'
  if (typeof n.deviceMemory === 'number' && n.deviceMemory < 4) return 'static'
  try {
    if (sessionStorage.getItem(WATCHDOG_KEY)) return 'static'
  } catch {
    /* ignore */
  }
  if (!hasWebGL()) return 'static'
  if (!isQa3d() && isSoftwareGL()) return 'static'
  return hero3dWidthTier()
}
