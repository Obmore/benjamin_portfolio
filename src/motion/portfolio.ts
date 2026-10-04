import './portfolio.css'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// Flat vector artwork lives on real CSS 3D planes. No external assets or renderer.
function circuit() {
  const paths = [
    'M20 34H66L86 54V73H99', 'M20 57H52L72 77H99',
    'M20 117H55L78 94H99', 'M20 140H68L89 119V105H99',
    'M151 73H177L199 51H230', 'M151 91H188L205 108H230',
    'M151 105H164L197 138H230', 'M113 54V31L99 17',
    'M136 54V32H166L181 17', 'M113 122V143L98 158',
    'M136 122V143H165L180 158',
  ]
  return `<svg viewBox="0 0 250 176" fill="none" aria-hidden="true">${paths.map(d => `<path d="${d}" stroke="currentColor" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`).join('')}${[[20,34],[20,57],[20,117],[20,140],[230,51],[230,108],[230,138],[99,17],[181,17],[98,158],[180,158]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="3" stroke="currentColor" vector-effect="non-scaling-stroke"/>`).join('')}</svg>`
}

function sculpture() {
  const scene = document.createElement('span')
  scene.className = 'pm-scene'
  scene.setAttribute('aria-hidden', 'true')
  const pins = Array.from({ length: 7 }, (_, i) => `<i style="--pin:${i}"></i>`).join('')
  scene.innerHTML = `<span class="pm-light"></span><span class="pm-object">
    <span class="pm-shadow"></span>
    <span class="pm-plane pm-base">${circuit()}</span>
    <span class="pm-plane pm-middle">${circuit()}</span>
    <span class="pm-plane pm-board">${circuit()}<span class="pm-mount pm-mount-a"></span><span class="pm-mount pm-mount-b"></span><span class="pm-mount pm-mount-c"></span><span class="pm-mount pm-mount-d"></span>
      <span class="pm-chip"><span class="pm-chip-top">OB.</span><span class="pm-chip-side pm-chip-front"></span><span class="pm-chip-side pm-chip-right"></span>
        <span class="pm-pins pm-pins-top">${pins}</span><span class="pm-pins pm-pins-bottom">${pins}</span><span class="pm-pins pm-pins-left">${pins}</span><span class="pm-pins pm-pins-right">${pins}</span>
      </span>
    </span>
  </span>`
  return scene
}

export function mountMotion() {
  const media = matchMedia('(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
  const root = document.documentElement
  const host = document.querySelector<HTMLElement>('.hero-3d-poster-host')
  const hero = document.querySelector<HTMLElement>('#hero')
  if (!host || !hero || !media.matches || root.dataset.spatialMotion) return
  const scene = sculpture()
  const object = scene.querySelector<HTMLElement>('.pm-object')!
  const board = scene.querySelector<HTMLElement>('.pm-board')!
  const middle = scene.querySelector<HTMLElement>('.pm-middle')!
  const chip = scene.querySelector<HTMLElement>('.pm-chip')!
  host.append(scene)
  const shots = [...document.querySelectorAll<HTMLElement>('.work-shot-frame')]
  let pending = 0, suspended = false, enabled = true, pointerX = 0, pointerY = 0
  let activeShot: HTMLElement | null = null, shotX = 0, shotY = 0
  const visible = new Set<Element>()
  const abort = new AbortController()
  const { signal } = abort

  function render() {
    pending = 0
    if (!enabled || suspended || document.hidden) return
    if (visible.has(hero!)) {
      const bounds = hero!.getBoundingClientRect()
      const progress = clamp(-bounds.top / (bounds.height * .8), 0, 1)
      const scale = Math.min(1, host!.clientWidth / 350, host!.clientHeight / 280)
      object.style.transform = `translate(-50%,-50%) rotateX(${56 - progress * 15 - pointerY * 5}deg) rotateZ(${-30 + progress * 22 + pointerX * 6}deg) scale(${scale})`
      board.style.transform = `translateZ(${20 + progress * 36}px)`
      middle.style.transform = `translateZ(${-6 + progress * 10}px)`
      chip.style.transform = `translateZ(${8 + progress * 46}px)`
    }
    for (const shot of shots) {
      if (!visible.has(shot)) continue
      const box = shot.getBoundingClientRect()
      const distance = clamp((innerHeight / 2 - box.top - box.height / 2) / innerHeight, -1, 1)
      const x = shot === activeShot ? shotX : 0
      const y = shot === activeShot ? shotY : 0
      shot.style.transform = `perspective(1100px) rotateX(${distance * 6 - y * 2}deg) rotateY(${x * 3}deg)`
    }
  }
  function request() {
    if (!pending && enabled && !suspended && !document.hidden) pending = requestAnimationFrame(render)
  }
  function pause() {
    if (pending) cancelAnimationFrame(pending)
    pending = 0
  }
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
      shots.forEach(shot => shot.style.removeProperty('transform'))
    } else request()
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target)
      else visible.delete(entry.target)
    }
    request()
  })
  observer.observe(hero)
  shots.forEach(shot => observer.observe(shot))
  window.addEventListener('scroll', request, { passive: true, signal })
  window.addEventListener('resize', request, { passive: true, signal })
  hero.addEventListener('pointermove', event => {
    const box = hero.getBoundingClientRect()
    pointerX = clamp((event.clientX - box.left) / box.width * 2 - 1, -1, 1)
    pointerY = clamp((event.clientY - box.top) / box.height * 2 - 1, -1, 1)
    request()
  }, { passive: true, signal })
  hero.addEventListener('pointerleave', reset, { signal })
  for (const shot of shots) {
    shot.addEventListener('pointermove', event => {
      const box = shot.getBoundingClientRect()
      activeShot = shot
      shotX = clamp((event.clientX - box.left) / box.width * 2 - 1, -1, 1)
      shotY = clamp((event.clientY - box.top) / box.height * 2 - 1, -1, 1)
      request()
    }, { passive: true, signal })
    shot.addEventListener('pointerleave', reset, { signal })
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause()
    else request()
  }, { signal })
  window.addEventListener('pagehide', () => { suspended = true; pause() }, { signal })
  window.addEventListener('pageshow', () => { suspended = false; request() }, { signal })
  media.addEventListener('change', syncPreference, { signal })
  // Page-lifetime module; preserve it across bfcache, dispose on Vite hot replacement.
  import.meta.hot?.dispose(() => {
    pause(); abort.abort(); observer.disconnect(); scene.remove()
    shots.forEach(shot => shot.style.removeProperty('transform'))
    delete root.dataset.spatialMotion
  })
  syncPreference()
}
