import { useEffect, useState } from 'react'

function readPreference() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(readPreference)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(readPreference())
    media.addEventListener('change', update)
    return () => {
      media.removeEventListener('change', update)
    }
  }, [])

  return reducedMotion
}

export function readMotionInterval(tokenName, fallback) {
  const token = window.getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim()
  const value = Number.parseFloat(token)
  return Number.isFinite(value) ? value : fallback
}
