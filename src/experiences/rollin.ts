import { createRollinScene, type RollinStage } from './rollin-scene'

const copy = {
  hu: {
    eyebrow: 'ROLLIN / INTERAKTÍV BEMUTATÓ', title: 'A kattintástól a mozdulatig.',
    intro: 'Próbálja ki, hogyan kapcsolódik össze a szoftver és az állomás.',
    steps: ['Dokkolva', 'Nyitás', 'Úton', 'Töltés'],
    labels: ['Nyitás', 'Visszahelyezés', 'Újrapróbálom'],
    status: ['A jármű dokkolva, a zár zárva. Indítsa el a nyitást.', 'A kérés eljut az állomáshoz, a zár kinyílik.', 'A jármű kivehető. A bérlés folyamatban van.', 'Visszahelyezés után a zár bezárul, a bérlés lezárul, és elindul a töltés.'],
    returning: 'A jármű visszakerül a dokkolóba.', locking: 'A jármű a helyén, a zár bezárul.', busy: 'Folyamatban…',
    software: 'Webes felület', control: 'Távoli vezérlés', station: 'Állomás',
    note: 'Szemléltető jelenet a Rollin bérlőrendszeréről.', view: 'Nézőpont',
  },
  en: {
    eyebrow: 'ROLLIN / INTERACTIVE DEMO', title: 'From a click to motion.',
    intro: 'Explore the connection between software and the station.',
    steps: ['Docked', 'Unlocking', 'On a ride', 'Charging'],
    labels: ['Unlock', 'Return vehicle', 'Try again'],
    status: ['The vehicle is docked and locked. Start by unlocking it.', 'The request reaches the station and the lock opens.', 'The vehicle is released. The rental is in progress.', 'Returning the vehicle locks it, ends the rental and starts charging.'],
    returning: 'The vehicle returns to the dock.', locking: 'The vehicle is in place and the lock is closing.', busy: 'In progress…',
    software: 'Web interface', control: 'Remote control', station: 'Station',
    note: 'An illustrative scene of the Rollin rental system.', view: 'Viewpoint',
  },
}

export function mountRollin(host: HTMLElement) {
  // Keep React's fallback node in place so locale reconciliation retains ownership.
  const fallback = host.querySelector<HTMLElement>('p')
  host.insertAdjacentHTML('beforeend', `<div class="rd-shell" data-stage="docked">
    <div class="rd-heading"><p class="rd-eyebrow"></p><h4 id="rollin-demo-title"></h4><p class="rd-intro"></p></div>
    <div class="rd-scene" aria-hidden="true">
      <div class="rd-halo"></div><svg class="rd-render" width="500" height="310" focusable="false"></svg>
      <div class="rd-scene-label"><span>04</span><i></i><b>ROLLIN</b></div>
    </div>
    <div class="rd-controls" role="group" aria-labelledby="rollin-demo-title">
      <div class="rd-chain"><span data-label="software"></span><b aria-hidden="true">→</b><span data-label="control"></span><b aria-hidden="true">→</b><span data-label="station"></span></div>
      <ol class="rd-steps">${[0, 1, 2, 3].map(i => `<li><span>0${i + 1}</span><b></b></li>`).join('')}</ol>
      <p class="rd-status" role="status" aria-live="polite" aria-atomic="true"></p>
      <div class="rd-actions"><button class="rd-action" type="button"></button><label class="rd-view"><span></span><input type="range" min="-42" max="-8" value="-24" /></label></div>
      <p class="rd-note"></p>
    </div>
  </div>`)
  const get = <T extends HTMLElement = HTMLElement>(selector: string) => host.querySelector<T>(selector)!
  const shell = get('.rd-shell')
  let scene: ReturnType<typeof createRollinScene>
  try { scene = createRollinScene(host.querySelector<SVGSVGElement>('.rd-render')!) }
  catch { shell.remove(); return () => {} }
  if (fallback) fallback.hidden = true
  const action = get<HTMLButtonElement>('.rd-action'), view = get<HTMLInputElement>('.rd-view input')
  const status = get('.rd-status'), steps = [...host.querySelectorAll<HTMLElement>('.rd-steps li')]
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  let stage: RollinStage = 'docked'
  let alive = true
  const words = () => copy[document.documentElement.lang === 'en' ? 'en' : 'hu']
  const index = () => stage === 'docked' ? 0 : stage === 'signal' || stage === 'open' ? 1 : stage === 'ride' || stage === 'leaving' || stage === 'return' ? 2 : 3
  const sync = () => {
    const t = words(), n = index(), busy = ['signal', 'open', 'leaving', 'return', 'locking'].includes(stage)
    get('.rd-eyebrow').textContent = t.eyebrow
    get('h4').textContent = t.title
    get('.rd-intro').textContent = t.intro
    get('.rd-note').textContent = t.note
    get('.rd-view span').textContent = t.view
    for (const key of ['software', 'control', 'station'] as const) get(`[data-label="${key}"]`).textContent = t[key]
    steps.forEach((step, i) => { step.querySelector('b')!.textContent = t.steps[i]; step.dataset.active = String(i === n) })
    status.textContent = stage === 'return' ? t.returning : stage === 'locking' ? t.locking : t.status[n]
    action.textContent = busy ? t.busy : t.labels[stage === 'ride' ? 1 : stage === 'charge' ? 2 : 0]
    // aria-disabled retains keyboard focus while preventing overlapping actions.
    action.setAttribute('aria-disabled', String(busy))
    shell.dataset.stage = stage
  }
  const set = (next: RollinStage, animate = false, complete?: () => void) => {
    if (!alive) return
    stage = next; sync(); scene.show(next, animate, complete)
  }
  const settle = () => {
    if (stage === 'signal' || stage === 'open' || stage === 'leaving') set('ride')
    else if (stage === 'return' || stage === 'locking') set('charge')
  }
  const click = () => {
    if (action.getAttribute('aria-disabled') === 'true') return
    if (stage === 'docked') {
      if (media.matches) set('ride')
      else set('signal', true, () => set('open', true, () => set('leaving', true, () => set('ride'))))
    } else if (stage === 'ride') {
      if (media.matches) set('charge')
      else set('return', true, () => set('locking', true, () => set('charge')))
    } else set('docked')
  }
  action.addEventListener('click', click)
  const viewpoint = () => scene.view(Number(view.value))
  view.addEventListener('input', viewpoint)
  const viewport = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) settle() })
  viewport.observe(shell)
  const visibility = () => { if (document.hidden) settle() }
  const preference = () => { if (media.matches) settle() }
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('pagehide', settle)
  media.addEventListener('change', preference)
  const language = new MutationObserver(sync)
  language.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
  sync()
  return () => {
    alive = false; scene.destroy(); viewport.disconnect(); language.disconnect()
    action.removeEventListener('click', click); view.removeEventListener('input', viewpoint)
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', settle)
    media.removeEventListener('change', preference)
    shell.remove()
    if (fallback) fallback.hidden = false
  }
}
