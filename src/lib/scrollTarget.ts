export function scrollElementTop(el: HTMLElement): number {
  const parent = el.parentElement
  const target = parent?.classList.contains('pin-spacer') ? parent : el
  return window.scrollY + target.getBoundingClientRect().top
}
