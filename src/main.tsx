import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (document.documentElement.hasAttribute('data-spatial-capable')) {
  const enhance = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    void import('./motion/portfolio').then(m => m.mountMotion()).catch(() => {
      delete document.documentElement.dataset.spatialCapable
    })
  }))
  if (document.readyState === 'complete') enhance()
  else window.addEventListener('load', enhance, { once: true })
}
