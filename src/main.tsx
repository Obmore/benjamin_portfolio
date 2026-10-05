import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { rawLocationHash, resolveAnchor } from './lib/hash'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Interaction is also available with reduced motion; only its animation is optional.
const experiences = () => {
  void import('./experiences').then(m => m.mountExperiences()).catch(() => {
    const host = document.querySelector('[data-rollin-demo] p')
    if (host) host.textContent = document.documentElement.lang === 'en'
      ? 'The interactive demo could not load. The project description is available below.'
      : 'A bemutató nem töltődött be. A projekt leírása alább olvasható.'
  })
}
if (document.readyState === 'complete') experiences()
else window.addEventListener('load', experiences, { once: true })

if (document.documentElement.hasAttribute('data-spatial-capable')) {
  const enhance = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    void import('./motion/portfolio').then(m => m.mountMotion()).catch(() => {
      const target = document.getElementById(resolveAnchor(rawLocationHash()))
      const previousTop = target?.getBoundingClientRect().top
      delete document.documentElement.dataset.spatialCapable
      // Removing the story spacer must not move a deep-linked section away.
      // Preserve its offset too if the visitor has already scrolled within it.
      if (target && previousTop !== undefined) {
        window.scrollBy({ top: target.getBoundingClientRect().top - previousTop, behavior: 'instant' })
      }
    })
  }))
  if (document.readyState === 'complete') enhance()
  else window.addEventListener('load', enhance, { once: true })
}
