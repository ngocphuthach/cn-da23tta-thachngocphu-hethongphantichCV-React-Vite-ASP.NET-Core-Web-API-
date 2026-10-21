import { useEffect, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion'

export function useReveal({ threshold = 0.15, once = true } = {}) {
  const ref = useRef(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const element = ref.current
    if (!element || reducedMotion || !('IntersectionObserver' in window)) return undefined

    let observer
    try {
      element.classList.add('reveal-observing')
      observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) {
          element.classList.add('is-visible')
          if (once) observer.unobserve(element)
        }
      }, { threshold })
      observer.observe(element)
    } catch {
      element.classList.remove('reveal-observing', 'is-visible')
      observer?.disconnect()
      return undefined
    }

    return () => {
      observer.disconnect()
      element.classList.remove('reveal-observing', 'is-visible')
    }
  }, [once, reducedMotion, threshold])

  return ref
}
