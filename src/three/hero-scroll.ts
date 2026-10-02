import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function attachHeroScroll(onProgress: (progress: number) => void) {
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
  onProgress(st.progress)

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
