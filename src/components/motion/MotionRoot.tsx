import { useLayoutEffect, type ReactNode } from 'react'
import { startMotionEngine } from '@/lib/motionEngine'

export function MotionRoot({ children }: { children: ReactNode }) {
  useLayoutEffect(() => startMotionEngine(), [])
  return children
}
