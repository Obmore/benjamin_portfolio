import './portfolio.css'
import { sculpture } from './sculpture'
import { createStory } from './story'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function mountMotion() {
  const media = matchMedia('(prefers-reduced-motion: no-preference)')
  const fine = matchMedia('(pointer: fine)')
  const root = document.documentElement
  const host = document.querySelector<HTMLElement>('.hero-3d-poster-host')
  const hero = document.querySelector<HTMLElement>('#hero')
  const storyHost = document.querySelector<HTMLElement>('[data-motion-story]')
  if (!host || !hero || !storyHost || !root.hasAttribute('data-spatial-capable') || root.dataset.spatialMotion) return
  const scene = sculpture()
  const object = scene.querySelector<HTMLElement>('.pm-object')!
  const board = scene.querySelector<HTMLElement>('.pm-board')!
  const middle = scene.querySelector<HTMLElement>('.pm-middle')!
  const chip = scene.querySelector<HTMLElement>('.pm-chip')!
  host.append(scene)
  const story = createStory(storyHost)
  // Measure the stationary wrapper, never the transformed image inside it.
  const shots = [...document.querySelectorAll<HTMLElement>('.work-shot')].map(wrapper => ({ wrapper, frame: wrapper.querySelector<HTMLElement>('.work-shot-frame')! }))
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  root.dataset.spatialQuality = !fine.matches || (memory && memory <= 4) ? 'lite' : 'full'
  let pending = 0, suspended = false, enabled = true, pointerX = 0, pointerY = 0, slowFrames = 0
  let activeShot: HTMLElement | null = null, shotX = 0, shotY = 0
  const visible = new Set<Element>()
  const abort = new AbortController()
  const { signal } = abort

  function render() {
    pending = 0
    if (!enabled || suspended || document.hidden) return
    const start = performance.now()
    if (visible.has(hero!)) {
      const bounds = hero!.getBoundingClientRect()
      const progress = clamp(-bounds.top / (bounds.height * .8), 0, 1)
      const scale = Math.min(1, host!.clientWidth / 350, host!.clientHeight / 280)
      object.style.transform = `translate(-50%,-50%) rotateX(${56 - progress * 15 - pointerY * 3}deg) rotateZ(${-30 + progress * 22 + pointerX * 4}deg) scale(${scale})`
      board.style.transform = `translateZ(${20 + progress * 36}px)`
      middle.style.transform = `translateZ(${-6 + progress * 10}px)`
      chip.style.transform = `translateZ(${8 + progress * 46}px)`
    }
    if (visible.has(storyHost!)) story.render(window.scrollY)
    for (const { wrapper, frame } of shots) {
      if (!visible.has(wrapper)) continue
      const box = wrapper.getBoundingClientRect()
      const distance = clamp((innerHeight / 2 - box.top - box.height / 2) / innerHeight, -1, 1)
      const x = wrapper === activeShot ? shotX : 0
      const y = wrapper === activeShot ? shotY : 0
      frame.style.transform = `perspective(1100px) rotateX(${distance * 5 - y * 2}deg) rotateY(${x * 3}deg)`
    }
    if (performance.now() - start > 12 && ++slowFrames >= 3) root.dataset.spatialQuality = 'lite'
  }
  function request() {
    if (!pending && enabled && !suspended && !document.hidden) pending = requestAnimationFrame(render)
  }
  function pause() {
    if (pending) cancelAnimationFrame(pending)
    pending = 0
  }
  function measure() { story.measure(); request() }
  function reset() {
    pointerX = pointerY = shotX = shotY = 0
    activeShot = null
    request()
  }
  function syncPreference() {
    enabled = media.matches
    root.dataset.spatialMotion = enabled ? 'ready' : 'paused'
    if (!enabled) {
      pause()
      reset()
      shots.forEach(({ frame }) => frame.style.removeProperty('transform'))
    } else measure()
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target)
      else visible.delete(entry.target)
    }
    request()
  })
  observer.observe(hero)
  observer.observe(storyHost)
  shots.forEach(({ wrapper }) => observer.observe(wrapper))
  const sizeObserver = new ResizeObserver(measure)
  sizeObserver.observe(document.body)
  sizeObserver.observe(story.stage)
  const languageObserver = new MutationObserver(() => { story.syncCopy(); measure() })
  languageObserver.observe(root, { attributes: true, attributeFilter: ['lang'] })
  window.addEventListener('scroll', request, { passive: true, signal })
  window.addEventListener('resize', measure, { passive: true, signal })
  hero.addEventListener('pointermove', event => {
    if (!fine.matches || event.pointerType === 'touch') return
    const box = hero.getBoundingClientRect()
    pointerX = clamp((event.clientX - box.left) / box.width * 2 - 1, -1, 1)
    pointerY = clamp((event.clientY - box.top) / box.height * 2 - 1, -1, 1)
    request()
  }, { passive: true, signal })
  hero.addEventListener('pointerleave', reset, { signal })
  for (const { wrapper } of shots) {
    wrapper.addEventListener('pointermove', event => {
      if (!fine.matches || event.pointerType === 'touch') return
      const box = wrapper.getBoundingClientRect()
      activeShot = wrapper
      shotX = clamp((event.clientX - box.left) / box.width * 2 - 1, -1, 1)
      shotY = clamp((event.clientY - box.top) / box.height * 2 - 1, -1, 1)
      request()
    }, { passive: true, signal })
    wrapper.addEventListener('pointerleave', reset, { signal })
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause()
    else measure()
  }, { signal })
  window.addEventListener('pagehide', () => { suspended = true; pause() }, { signal })
  window.addEventListener('pageshow', () => { suspended = false; measure() }, { signal })
  media.addEventListener('change', syncPreference, { signal })
  import.meta.hot?.dispose(() => {
    pause(); abort.abort(); observer.disconnect(); sizeObserver.disconnect(); languageObserver.disconnect(); scene.remove()
    storyHost.replaceChildren()
    shots.forEach(({ frame }) => frame.style.removeProperty('transform'))
    delete root.dataset.spatialMotion
  })
  syncPreference()
}
