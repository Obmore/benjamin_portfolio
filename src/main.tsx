import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

const spatial = matchMedia('(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
if (spatial.matches && !connection?.saveData) {
  const enhance = () => setTimeout(() => {
    if (spatial.matches) void import('./motion/portfolio').then(m => m.mountMotion()).catch(() => {})
  }, 1600)
  if (document.readyState === 'complete') enhance()
  else window.addEventListener('load', enhance, { once: true })
}
