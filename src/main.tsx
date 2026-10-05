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

// Load interactive references near their section, including with reduced motion.
const experiences = () => {
  const section = document.querySelector('.munkaim-section')
  if (!section) return
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return
    observer.disconnect()
    // The React-owned project description remains usable if enhancement fails.
    void import('./experiences').then(m => m.mountExperiences()).catch(() => {})
  }, { rootMargin: '600px' })
  observer.observe(section)
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
