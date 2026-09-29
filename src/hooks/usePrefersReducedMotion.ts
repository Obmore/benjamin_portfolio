import { useEffect, useState } from 'react'
import { shouldUseStaticMotion } from '@/lib/motionProfile'

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(shouldUseStaticMotion)

  useEffect(() => {
    const update = () => setReduced(shouldUseStaticMotion())
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reduced
}
