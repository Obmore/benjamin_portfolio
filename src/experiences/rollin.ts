const copy = {
  hu: {
    eyebrow: 'ROLLIN / INTERAKTÍV BEMUTATÓ', title: 'A kattintástól a mozdulatig.',
    intro: 'Próbálja ki, hogyan kapcsolódik össze a szoftver és az állomás.',
    steps: ['Dokkolva', 'Nyitás', 'Úton', 'Töltés'],
    labels: ['Nyitás', 'Visszahelyezés', 'Újrapróbálom'],
    status: ['A jármű dokkolva, a zár zárva. Indítsa el a nyitást.', 'A kérés eljut az állomáshoz, a zár kinyílik.', 'A jármű kivehető. A bérlés folyamatban van.', 'Visszahelyezés után a zár bezárul, a bérlés lezárul, és elindul a töltés.'],
    returning: 'A jármű visszakerül a dokkolóba.', busy: 'Folyamatban…',
    software: 'Webes felület', control: 'Távoli vezérlés', station: 'Állomás',
    note: 'Szemléltető jelenet a Rollin bérlőrendszeréről.', view: 'Nézőpont',
  },
  en: {
    eyebrow: 'ROLLIN / INTERACTIVE DEMO', title: 'From a click to motion.',
    intro: 'Explore the connection between software and the station.',
    steps: ['Docked', 'Unlocking', 'On a ride', 'Charging'],
    labels: ['Unlock', 'Return vehicle', 'Try again'],
    status: ['The vehicle is docked and locked. Start by unlocking it.', 'The request reaches the station and the lock opens.', 'The vehicle is released. The rental is in progress.', 'Returning the vehicle locks it, ends the rental and starts charging.'],
    returning: 'The vehicle returns to the dock.', busy: 'In progress…',
    software: 'Web interface', control: 'Remote control', station: 'Station',
    note: 'An illustrative scene of the Rollin rental system.', view: 'Viewpoint',
  },
}

// A schematic assembled from CSS 3D planes, not a product CAD model.
const scooter = `<svg viewBox="0 0 220 180" fill="none" aria-hidden="true">
  <circle cx="29" cy="151" r="23" fill="#183848"/><circle cx="185" cy="151" r="23" fill="#183848"/>
  <circle cx="29" cy="151" r="12" fill="#b5cbd2"/><circle cx="185" cy="151" r="12" fill="#b5cbd2"/>
  <circle cx="29" cy="151" r="5" fill="#4e7284"/><circle cx="185" cy="151" r="5" fill="#4e7284"/>
  <path vector-effect="non-scaling-stroke" d="M30 144H133L161 122L179 142" stroke="#5a7b89" stroke-width="13" stroke-linejoin="round"/>
  <path vector-effect="non-scaling-stroke" d="M37 138H133" stroke="#152f3b" stroke-width="7" stroke-linecap="round"/>
  <path vector-effect="non-scaling-stroke" d="M180 144L150 31" stroke="#b4c7cf" stroke-width="12" stroke-linecap="round"/>
  <path vector-effect="non-scaling-stroke" d="M176 133L149 33" stroke="#e8f1f4" stroke-width="4"/>
  <path vector-effect="non-scaling-stroke" d="M134 27H173" stroke="#183848" stroke-width="9" stroke-linecap="round"/>
  <path vector-effect="non-scaling-stroke" d="M178 122L190 126" stroke="#169996" stroke-width="7" stroke-linecap="round"/>
  <path vector-effect="non-scaling-stroke" d="M17 125Q30 119 44 127" stroke="#7695a2" stroke-width="5" stroke-linecap="round"/>
</svg>`

export function mountRollin(host: HTMLElement) {
  // Keep React's fallback node in place so locale reconciliation retains ownership.
  const fallback = host.querySelector<HTMLElement>('p')
  if (fallback) fallback.hidden = true
  host.insertAdjacentHTML('beforeend', `<div class="rd-shell" data-stage="docked">
    <div class="rd-heading"><p class="rd-eyebrow"></p><h4 id="rollin-demo-title"></h4><p class="rd-intro"></p></div>
    <div class="rd-scene" aria-hidden="true">
      <div class="rd-halo"></div><div class="rd-world">
        <div class="rd-ground"></div><div class="rd-route"><i></i></div>
        <div class="rd-base"><div class="rd-top"><span>ROLLIN</span></div><div class="rd-front"></div><div class="rd-side"></div></div>
        ${[0, 1, 2, 3].map(i => `<div class="rd-dock ${i === 3 ? 'rd-active' : ''}" style="--slot:${i}"><div class="rd-dock-top"><i></i></div><div class="rd-dock-front"><span>0${i + 1}</span></div><div class="rd-dock-side"></div><div class="rd-lock"></div></div>`).join('')}
        <div class="rd-vehicle">${scooter}</div><div class="rd-charge">＋</div>
      </div>
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
  const shell = get('.rd-shell'), world = get('.rd-world'), scene = get('.rd-scene')
  const action = get<HTMLButtonElement>('.rd-action'), view = get<HTMLInputElement>('.rd-view input')
  const status = get('.rd-status'), steps = [...host.querySelectorAll<HTMLElement>('.rd-steps li')]
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  let stage = 'docked', timer = 0, alive = true
  const words = () => copy[document.documentElement.lang === 'en' ? 'en' : 'hu']
  const index = () => stage === 'docked' ? 0 : stage === 'signal' || stage === 'open' ? 1 : stage === 'ride' || stage === 'return' ? 2 : 3
  const sync = () => {
    const t = words(), n = index(), busy = ['signal', 'open', 'return'].includes(stage)
    get('.rd-eyebrow').textContent = t.eyebrow
    get('h4').textContent = t.title
    get('.rd-intro').textContent = t.intro
    get('.rd-note').textContent = t.note
    get('.rd-view span').textContent = t.view
    for (const key of ['software', 'control', 'station'] as const) get(`[data-label="${key}"]`).textContent = t[key]
    steps.forEach((step, i) => { step.querySelector('b')!.textContent = t.steps[i]; step.dataset.active = String(i === n) })
    status.textContent = stage === 'return' ? t.returning : t.status[n]
    action.textContent = busy ? t.busy : t.labels[stage === 'ride' ? 1 : stage === 'charge' ? 2 : 0]
    // aria-disabled retains keyboard focus while preventing overlapping actions.
    action.setAttribute('aria-disabled', String(busy))
    shell.dataset.stage = stage
  }
  const set = (next: string) => { stage = next; sync() }
  const later = (fn: () => void, ms: number) => { clearTimeout(timer); timer = window.setTimeout(() => { if (alive) fn() }, ms) }
  const settle = () => {
    clearTimeout(timer)
    if (stage === 'signal' || stage === 'open') set('ride')
    else if (stage === 'return') set('charge')
  }
  const click = () => {
    if (action.getAttribute('aria-disabled') === 'true') return
    if (stage === 'docked') {
      if (media.matches) set('ride')
      else { set('signal'); later(() => { set('open'); later(() => set('ride'), 650) }, 500) }
    } else if (stage === 'ride') {
      if (media.matches) set('charge')
      else { set('return'); later(() => set('charge'), 950) }
    } else set('docked')
  }
  action.addEventListener('click', click)
  const resize = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect
    world.style.setProperty('--rd-scale', String(Math.min(.94, width / 600, height / 400)))
  })
  resize.observe(scene)
  view.addEventListener('input', () => world.style.setProperty('--rd-angle', `${view.value}deg`))
  const visibility = () => { if (document.hidden) settle() }
  const preference = () => { if (media.matches) settle() }
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('pagehide', settle)
  media.addEventListener('change', preference)
  const language = new MutationObserver(sync)
  language.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
  sync()
  return () => {
    alive = false; clearTimeout(timer); resize.disconnect(); language.disconnect()
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', settle)
    media.removeEventListener('change', preference)
    shell.remove()
    if (fallback) fallback.hidden = false
  }
}
