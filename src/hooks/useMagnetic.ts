import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { shouldUseStaticMotion } from '@/lib/motionProfile'

export function useMagnetic<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    if (shouldUseStaticMotion()) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const xTo = gsap.quickTo(el, 'x', { duration: 0.32, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.32, ease: 'power3.out' })

    const move = (event: MouseEvent) => {
      const box = el.getBoundingClientRect()
      xTo((event.clientX - box.left - box.width / 2) * 0.32)
      yTo((event.clientY - box.top - box.height / 2) * 0.32)
    }
    const leave = () => {
      xTo(0)
      yTo(0)
    }

    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)
    return () => {
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseleave', leave)
      gsap.set(el, { x: 0, y: 0 })
    }
  }, [enabled])

  return ref
}
