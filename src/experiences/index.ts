import './styles.css'
import { mountRollin } from './rollin'

export function mountExperiences() {
  const host = document.querySelector<HTMLElement>('[data-rollin-demo]')
  const cleanup = host ? mountRollin(host) : undefined
  const devices = [...document.querySelectorAll<HTMLElement>('.work-shot')].map(shot => {
    const project = shot.closest<HTMLElement>('.work-card')!
    const id = project.id.replace('munka-', '')
    const button = document.createElement('button')
    button.className = 'work-device-toggle'
    button.type = 'button'
    button.setAttribute('aria-pressed', 'false')
    const phone = document.createElement('div')
    phone.className = 'work-phone'
    phone.id = `${id}-phone`
    phone.setAttribute('aria-hidden', 'true')
    button.setAttribute('aria-controls', phone.id)
    button.addEventListener('click', () => {
      const show = button.getAttribute('aria-pressed') !== 'true'
      if (!phone.firstChild) {
        const img = document.createElement('img')
        img.src = `${import.meta.env.BASE_URL}work/${id}-mobile.jpg`
        img.width = 390; img.height = 760; img.alt = ''; img.decoding = 'async'
        phone.append(img)
      }
      button.setAttribute('aria-pressed', String(show))
      shot.dataset.device = show ? 'mobile' : 'desktop'
    })
    shot.append(phone, button)
    return { shot, button, phone, project }
  })
  const labels = () => {
    const en = document.documentElement.lang === 'en'
    devices.forEach(({ button, project }) => {
      button.textContent = en ? 'Mobile view' : 'Mobilnézet'
      button.setAttribute('aria-label', `${project.querySelector('h3')!.textContent}: ${en ? 'show mobile view' : 'mobilnézet megjelenítése'}`)
    })
  }
  labels()
  const language = new MutationObserver(labels)
  language.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
  // React owns the project content. Each enhancement has its own unmanaged host.
  const destroy = () => {
    cleanup?.(); language.disconnect()
    devices.forEach(({ shot, button, phone }) => { button.remove(); phone.remove(); delete shot.dataset.device })
  }
  import.meta.hot?.dispose(destroy)
  return destroy
}
