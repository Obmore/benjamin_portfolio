export function mountFlow() {
  const flow = document.querySelector<HTMLElement>('.mg-flow')!
  const caption = document.querySelector<HTMLElement>('#mg-flow-caption')!
  const track = document.querySelector<HTMLElement>('.mg-flow-track')!
  const progress = document.querySelector<HTMLElement>('.mg-flow-progress span')!
  const steps = [...flow.querySelectorAll<HTMLButtonElement>('[data-flow-step]')]
  const sheets = [...flow.querySelectorAll<HTMLElement>('.mg-flow-sheet')]
  const cells = [...flow.querySelectorAll<HTMLElement>('.mg-flow-morph i')]
  const captions = [
    'A mostani Excel- vagy PDF-lapból indulunk ki.',
    'Az adatokat a vevő egy webes űrlapon adhatja meg.',
    'A beérkező adatokat a választott csomagtól függően e-mailben vagy a saját táblázatában kapja meg.',
  ]
  const poses = [
    [[-18,-12,44,0,1],[5,8,0,0,1],[27,27,-44,0,1]],
    [[-55,-24,-65,-10,.55],[0,0,65,0,1],[50,25,-70,9,.6]],
    [[-16,-14,-90,0,.5],[8,8,-35,0,.65],[0,0,75,0,1]],
  ]
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  let auto = !media.matches, manual = false, visible = false, suspended = false, frame = 0, value = 0
  const clamp = (v: number) => Math.max(0, Math.min(1, v))
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  function render(p: number) {
    value = p
    const phase = Math.min(1, Math.floor(p * 2)), blend = p * 2 - phase
    sheets.forEach((sheet, i) => {
      const pose = poses[phase][i].map((v, j) => lerp(v, poses[phase + 1][i][j], blend))
      sheet.style.transform = `translate3d(${pose[0]}px,${pose[1]}px,${pose[2]}px) rotateZ(${pose[3]}deg)`
      sheet.style.opacity = String(pose[4])
    })
    cells.forEach((cell, i) => {
      const grid = [18 + i % 4 * 43, 60 + Math.floor(i / 4) * 23]
      const form = [24 + i % 2 * 68, 45 + Math.floor(i / 2) * 24, 66]
      const a = phase === 0 ? [grid[0] - 18, grid[1] - 12, 45] : form
      const b = phase === 0 ? form : [...grid, 76]
      const rise = Math.sin(blend * Math.PI) * 28
      cell.style.transform = `translate3d(${lerp(a[0],b[0],blend)}px,${lerp(a[1],b[1],blend)}px,${lerp(a[2],b[2],blend) + rise}px) scaleX(${1 + Math.sin(p * Math.PI) * .7})`
    })
    const step = Math.min(2, Math.floor(p * 3))
    flow.dataset.step = String(step)
    steps.forEach((button, i) => button.setAttribute('aria-pressed', String(i === step)))
    if (caption.textContent !== captions[step]) caption.textContent = captions[step]
    progress.style.transform = `scaleX(${p})`
  }
  function sync() {
    flow.dataset.follow = String(auto)
    caption.setAttribute('aria-live', auto ? 'off' : 'polite')
  }
  function update() {
    frame = 0
    if (!auto || !visible || suspended || document.hidden || media.matches) return
    // Scrub only while native sticky positioning keeps the whole scene visible.
    const distance = track.offsetHeight - flow.offsetHeight
    if (distance < 1) return
    const start = track.getBoundingClientRect().top + scrollY - 88
    render(clamp((scrollY - start) / distance))
  }
  function request() { if (!frame && auto && visible && !suspended && !document.hidden) frame = requestAnimationFrame(update) }
  function pause() { cancelAnimationFrame(frame); frame = 0 }
  steps.forEach((button, i) => button.addEventListener('click', () => {
    manual = true; auto = false; pause(); sync(); render(i / 2)
  }))
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) request(); else { pause(); manual = false; auto = !media.matches; sync() } })
  observer.observe(flow)
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', request, { passive: true })
  window.addEventListener('pagehide', () => { suspended = true; pause() })
  window.addEventListener('pageshow', () => { suspended = false; request() })
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else request() })
  media.addEventListener('change', () => {
    auto = !media.matches && !manual
    if (media.matches) { pause(); render(Math.round(value * 2) / 2) }
    sync(); request()
  })
  sync(); render(0)
}
