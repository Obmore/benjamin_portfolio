import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ScrollTrigger already ticks on gsap.ticker. Hero 3D requests paints on that
// same ticker (view-manager requestRender) so scroll does not start a second rAF.

export function attachHeroScroll(
  onProgress: (progress: number) => void,
  opts: { skipInitial?: boolean } = {},
) {
  const trigger = document.querySelector('#hero') || document.querySelector('.hero-visual')
  if (!trigger) return () => {}

  const st = ScrollTrigger.create({
    trigger,
    start: 'top top',
    end: 'bottom 35%',
    scrub: 0.6,
    onUpdate(self) {
      onProgress(self.progress)
    },
  })
  if (!opts.skipInitial) onProgress(st.progress)

  let timer = 0
  const refresh = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => st.refresh(), 150)
  }
  window.addEventListener('resize', refresh)
  const mo = new MutationObserver(refresh)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })

  return () => {
    window.clearTimeout(timer)
    window.removeEventListener('resize', refresh)
    mo.disconnect()
    st.kill()
  }
}
