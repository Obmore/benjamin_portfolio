import { getGPUTier, type ModelEntry } from 'detect-gpu'

export function bootHero3d(): () => void {
  const box = document.querySelector<HTMLElement>('.hero-3d')
  if (!box || document.documentElement.classList.contains('is-hero-poster')) return () => {}
  const controller = new AbortController(), { signal } = controller
  let stopView = () => {}, context: WebGL2RenderingContext | null = null
  const stop = () => {
    controller.abort(); stopView()
    context?.getExtension('WEBGL_lose_context')?.loseContext()
    window.removeEventListener('pagehide', stop)
  }
  window.addEventListener('pagehide', stop, { once: true })
  void (async () => {
    box.dataset.hero3d = 'boot'
    const canvas = document.createElement('canvas')
    context = canvas.getContext('webgl2', { alpha: true, antialias: true,
      powerPreference: 'low-power', failIfMajorPerformanceCaveat: true })
    if (!context) throw new Error('webgl')
    const debug = context.getExtension('WEBGL_debug_renderer_info')
    const gpu = String(context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER))
    if (/swiftshader|llvmpipe|software/i.test(gpu)) throw new Error('software')
    const tier = await getGPUTier({ glContext: context, failIfMajorPerformanceCaveat: true,
      override: { isMobile: false, loadBenchmarks: async file => {
        if (!/^d-[a-z]+\.json$/.test(file)) throw new Error('benchmark')
        const res = await fetch(`/detect-gpu/${file}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(1500)]) })
        if (!res.ok) throw new Error('benchmark')
        const data: unknown = await res.json()
        if (!Array.isArray(data) || data.length < 2 || Number.parseInt(String(data[0])) < 4) throw new Error('benchmark')
        return data.slice(1) as ModelEntry[]
      } } })
    signal.throwIfAborted()
    if (tier.tier < 2) throw new Error('tier')
    const { startHero3d } = await import('@/three/hero3d')
    signal.throwIfAborted()
    stopView = await startHero3d(box, canvas, context, signal)
  })().catch(() => { stop(); box.dataset.hero3d = 'poster' })
  return stop
}
