import { gsap } from 'gsap'

export function flyValue(from: Element, to: Element, text: string): void {
  const value = text.trim()
  if (!value) return

  const start = from.getBoundingClientRect()
  const end = to.getBoundingClientRect()
  if (start.width < 2 || start.height < 2 || end.width < 2 || end.height < 2) return

  const clone = document.createElement('span')
  clone.className = 'quote-fly'
  clone.textContent = value
  clone.setAttribute('aria-hidden', 'true')
  clone.style.left = `${start.left}px`
  clone.style.top = `${start.top}px`
  clone.style.width = `${Math.min(Math.max(start.width, 64), 240)}px`
  document.body.appendChild(clone)

  gsap.fromTo(
    clone,
    { x: 0, y: 0, opacity: 1, scale: 1 },
    {
      x: end.left - start.left,
      y: end.top - start.top,
      opacity: 0.12,
      scale: 0.92,
      duration: 0.42,
      ease: 'power2.inOut',
      onComplete: () => clone.remove(),
    },
  )
}

export function flyField(root: ParentNode, key: string, text: string): void {
  const from = root.querySelector(`[data-quote-source="${key}"]`)
  const to = root.querySelector(`[data-preview-line="${key}"]`)
  if (from && to) flyValue(from, to, text)
}
