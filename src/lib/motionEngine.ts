import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { shouldUseStaticMotion } from './motionProfile'
import { scrollElementTop } from './scrollTarget'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null
let tickerFn: ((time: number) => void) | null = null

export function getLenis(): Lenis | null {
  return lenis
}

export function refreshScroll(): void {
  ScrollTrigger.refresh()
}

export function startMotionEngine(): () => void {
  const staticMotion = shouldUseStaticMotion()
  document.documentElement.classList.toggle('is-static-motion', staticMotion)
  document.documentElement.classList.toggle('is-motion', !staticMotion)

  if (staticMotion) {
    document.documentElement.classList.remove('lenis', 'lenis-smooth')
    return () => {
      document.documentElement.classList.remove('is-static-motion', 'is-motion')
    }
  }

  const instance = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 0.9,
    autoRaf: false,
  })
  lenis = instance
  window.__lenis = instance
  instance.on('scroll', ScrollTrigger.update)
  tickerFn = (time: number) => {
    instance.raf(time * 1000)
  }
  gsap.ticker.add(tickerFn)
  gsap.ticker.lagSmoothing(0)
  document.documentElement.classList.add('lenis', 'lenis-smooth')
  document.documentElement.style.scrollBehavior = 'auto'

  const onLoad = () => ScrollTrigger.refresh()
  window.addEventListener('load', onLoad)

  return () => {
    window.removeEventListener('load', onLoad)
    if (tickerFn) gsap.ticker.remove(tickerFn)
    tickerFn = null
    instance.destroy()
    lenis = null
    delete window.__lenis
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    document.documentElement.classList.remove('lenis', 'lenis-smooth', 'is-motion')
    document.documentElement.style.scrollBehavior = ''
  }
}

export function engineScrollTo(id: string): boolean {
  const element = document.getElementById(id)
  if (!element || !lenis) return false
  const y = Math.max(0, Math.round(scrollElementTop(element) - 72))
  lenis.scrollTo(y, { duration: 1.05 })
  return true
}
