/** Local draft only: no fetch, storage or automatic email transmission. */
export function mountInquiry(copyText: (text: string) => Promise<boolean>) {
  const service = document.querySelector<HTMLSelectElement>('#mg-service')!
  const description = document.querySelector<HTMLTextAreaElement>('#mg-description')!
  const write = document.querySelector<HTMLAnchorElement>('#mg-write')!
  const copy = document.querySelector<HTMLButtonElement>('#mg-draft-copy')!
  const fallback = document.querySelector<HTMLTextAreaElement>('#mg-draft-fallback')!
  const status = document.querySelector<HTMLElement>('#mg-status')!
  const directEmail = write.href
  let copiedTimer = 0
  let revision = 0
  const draft = () => {
    const topic = service.value ? `Ez a szolgáltatás érdekel: ${service.selectedOptions[0].text}.` : 'Segítséget szeretnék kérni a megfelelő megoldás kiválasztásához.'
    return `Kedves Benjámin!\n\n${topic}\n\n${description.value.trim() || 'Jelenleg így dolgozom:\n\nEzt szeretném egyszerűbbé tenni:\n\nA kívánt eredmény:'}\n`
  }
  const update = () => {
    revision++
    clearTimeout(copiedTimer)
    copy.textContent = 'Levélszöveg másolása'
    write.href = `${directEmail}&body=${encodeURIComponent(draft())}`
    fallback.hidden = true
    fallback.value = ''
    status.textContent = ''
  }
  service.addEventListener('change', update)
  description.addEventListener('input', update)
  copy.hidden = false
  copy.addEventListener('click', () => {
    clearTimeout(copiedTimer)
    copy.textContent = 'Levélszöveg másolása'
    void (async () => {
      const copiedRevision = ++revision
      const text = draft()
      const copied = await copyText(text)
      if (copiedRevision !== revision) return
      if (copied) {
        copy.textContent = 'Levélszöveg kimásolva'
        clearTimeout(copiedTimer)
        copiedTimer = window.setTimeout(() => { copy.textContent = 'Levélszöveg másolása' }, 2500)
        status.textContent = 'A levél szövegét kimásoltam. Beillesztheti a saját levelezőjébe.'
      } else {
        fallback.value = text
        fallback.hidden = false
        fallback.focus({ preventScroll: true })
        fallback.select()
        status.textContent = 'Az automatikus másolás nem sikerült. A levél szövegét az alábbi mezőből másolhatja ki.'
      }
    })()
  })
  const navigate = (link: HTMLAnchorElement, event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const target = document.getElementById(link.hash.slice(1))
    if (!target) return
    event.preventDefault()
    if (link.classList.contains('mg-plan-cta')) {
      service.value = link.closest<HTMLElement>('.mg-plan')!.id.replace('szolgaltatas-', '')
      update()
      description.focus({ preventScroll: true })
    } else {
      target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    }
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
  }
  document.querySelectorAll<HTMLAnchorElement>('.mg-choose a,.mg-plan-cta,.mg-skip').forEach(link => {
    link.addEventListener('click', event => navigate(link, event))
  })
  update()

}
