import { sculpture } from './sculpture'

const clamp = (n: number) => Math.max(0, Math.min(1, n))
const smooth = (n: number) => { const p = clamp(n); return p * p * (3 - 2 * p) }

/** Native sticky positioning keeps navigation, touch scrolling and keyboard scrolling intact. */
export function createStory(section: HTMLElement) {
  section.innerHTML = `<div class="cs-sticky">
    <div class="cs-atmosphere" aria-hidden="true"></div>
    <div class="cs-layout">
      <div class="cs-copy">
        <p class="cs-eyebrow"><span class="cs-count">01</span><span>/ 03</span><span class="cs-eyebrow-label"></span></p>
        <div class="cs-captions">${[0, 1, 2].map(i => `<div class="cs-caption" data-active="${i === 0}"><h2></h2><p></p></div>`).join('')}</div>
        <a class="cs-skip" href="#munkaim"></a>
      </div>
      <div class="cs-art" aria-hidden="true">
        <div class="cs-orbit-grid"></div><div class="cs-hardware"></div>
        <div class="cs-network"><div class="cs-world">
          ${['Python', 'React', 'C#'].map((label, i) => `<div class="cs-window cs-window-${i}"><div class="cs-window-bar"><i></i><i></i><i></i><span>${label}</span></div><div class="cs-code">${[0, 1, 2, 3, 4].map(j => `<b style="--line:${j}"></b>`).join('')}</div><div class="cs-chart"><i></i><i></i><i></i><i></i><i></i></div></div>`).join('')}
          <div class="cs-cube">${[0, 1, 2, 3, 4, 5].map(i => `<div class="cs-face cs-face-${i}">${i < 2 ? 'OB.' : '<span>+</span>'}</div>`).join('')}</div>
          <div class="cs-rings">${[0, 1, 2].map(i => `<div class="cs-ring cs-ring-${i}"></div>`).join('')}</div>
          ${[0, 1, 2, 3, 4, 5].map(i => `<span class="cs-node" data-node="${i}"></span>`).join('')}
        </div></div>
      </div>
    </div>
    <div class="cs-footer"><span class="cs-hint"></span><div class="cs-progress"><span></span></div><span class="cs-end">03</span></div>
  </div>`
  const get = <T extends HTMLElement = HTMLElement>(selector: string) => section.querySelector<T>(selector)!
  const stage = get('.cs-sticky')
  const art = get('.cs-art')
  const hardware = get('.cs-hardware')
  hardware.append(sculpture())
  const object = get('.pm-object'), board = get('.pm-board'), middle = get('.pm-middle'), chip = get('.pm-chip')
  const network = get('.cs-network'), world = get('.cs-world'), cube = get('.cs-cube'), rings = get('.cs-rings')
  const panels = [...section.querySelectorAll<HTMLElement>('.cs-window')]
  const nodes = [...section.querySelectorAll<HTMLElement>('.cs-node')]
  const captions = [...section.querySelectorAll<HTMLElement>('.cs-caption')]
  const progress = get('.cs-progress span'), count = get('.cs-count')
  let width = 480, height = 450, top = 0, travel = 1, chapter = -1

  const measure = () => {
    width = art.clientWidth
    height = art.clientHeight
    top = section.getBoundingClientRect().top + window.scrollY - 64
    travel = Math.max(1, section.offsetHeight - stage.offsetHeight)
  }
  const syncCopy = () => {
    const english = document.documentElement.lang === 'en'
    const cards = document.querySelectorAll('#rolam .card-elev')
    captions.forEach((caption, i) => {
      caption.querySelector('h2')!.textContent = cards[i]?.querySelector('h3')?.textContent ?? ''
      caption.querySelector('p')!.textContent = cards[i]?.querySelector('p')?.textContent ?? ''
    })
    section.setAttribute('aria-label', english ? 'Engineering, software, connection' : 'Mérnöki szemlélet, szoftver, kapcsolódás')
    get('.cs-eyebrow-label').textContent = english ? 'BEHIND THE SURFACE' : 'A FELSZÍN MÖGÖTT'
    get('.cs-skip').textContent = english ? 'Explore my work ↗' : 'Tovább a munkáimhoz ↗'
    get('.cs-hint').textContent = english ? 'Scroll to explore' : 'Görgess, és nézz a felszín mögé'
  }
  const render = (y: number) => {
    const p = clamp((y - top) / travel)
    const scale = Math.min(width / 480, height / 450, 1.6)
    const unfold = smooth(p / .3), networkIn = smooth((p - .25) / .16), connected = smooth((p - .62) / .24)
    object.style.transform = `translate(-50%,-50%) rotateX(${58 - unfold * 22}deg) rotateZ(${-32 + p * 75}deg) scale(${scale * (1.45 - networkIn * .2)})`
    board.style.transform = `translateZ(${16 + unfold * 38}px)`
    middle.style.transform = `translateZ(${-8 + unfold * 8}px)`
    chip.style.transform = `translateZ(${8 + unfold * 48}px)`
    hardware.style.opacity = String(1 - networkIn)
    hardware.style.transform = `translateX(${-networkIn * width * .1}px)`
    network.style.opacity = String(networkIn)
    world.style.transform = `translate(-50%,-50%) scale(${scale}) rotateX(${8 - connected * 13}deg) rotateY(${-12 + p * 28}deg)`
    cube.style.transform = `translate(-50%,-50%) rotateX(${-22 + p * 55}deg) rotateY(${32 + p * 150}deg) scale(${.7 + connected * .65})`
    rings.style.opacity = String(connected)
    rings.style.transform = `rotateX(${55 + p * 35}deg) rotateY(${p * 90}deg) rotateZ(${p * 180}deg)`
    const poses = [[-155, -82, 15], [158, 15, -38], [-10, 138, 52]]
    panels.forEach((panel, i) => {
      const [x, py, z] = poses[i]
      panel.style.opacity = String(1 - connected)
      panel.style.transform = `translate(-50%,-50%) translate3d(${x * (1 - connected * .75)}px,${py * (1 - connected * .75)}px,${z}px) rotateY(${(i - 1) * -22 + p * 12}deg) rotateX(${i === 1 ? -8 : 10}deg) scale(${1 - connected * .65})`
    })
    nodes.forEach((node, i) => {
      const angle = i * Math.PI / 3 + p * Math.PI * 1.4
      node.style.transform = `translate(-50%,-50%) translate3d(${Math.cos(angle) * (170 + connected * 24)}px,${Math.sin(angle) * 122}px,${Math.sin(angle * 2) * 88}px)`
    })
    const next = Math.min(2, Math.floor(p * 3))
    if (next !== chapter) {
      chapter = next
      captions.forEach((caption, i) => { caption.dataset.active = String(i === chapter); caption.setAttribute('aria-hidden', String(i !== chapter)) })
      count.textContent = `0${chapter + 1}`
      section.dataset.chapter = String(chapter + 1)
    }
    progress.style.transform = `scaleX(${p})`
    section.dataset.progress = p.toFixed(3)
  }
  syncCopy()
  measure()
  return { render, measure, syncCopy, stage }
}
