import { useEffect, useState } from 'react'
import { readMotionInterval, useReducedMotion } from './useReducedMotion'

export function useCountUp(target, duration) {
  const reducedMotion = useReducedMotion()
  const numericTarget = Number.isFinite(Number(target)) ? Number(target) : 0
  const durationMs = duration ?? readMotionInterval('--motion-duration-count', 850)
  const [value, setValue] = useState(reducedMotion ? numericTarget : 0)

  useEffect(() => {
    if (reducedMotion || durationMs <= 0) {
      const frameId = window.requestAnimationFrame(() => setValue(numericTarget))
      return () => window.cancelAnimationFrame(frameId)
    }

    let startTime
    let frameId
    const animate = (time) => {
      startTime ??= time
      const progress = Math.min(1, (time - startTime) / durationMs)
      const eased = 1 - ((1 - progress) ** 3)
      setValue(numericTarget * eased)
      if (progress < 1) frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frameId)
  }, [durationMs, numericTarget, reducedMotion])

  return value
}
