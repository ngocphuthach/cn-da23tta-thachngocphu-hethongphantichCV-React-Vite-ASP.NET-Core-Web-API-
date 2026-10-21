import { useEffect } from 'react'
import { useReducedMotion } from './useReducedMotion'

export function usePointerParallax(ref, { selector, mode = 'tilt' }) {
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const root = ref.current
    if (!root || reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined

    let frame = 0
    let pendingEvent = null
    let activeTarget = null
    const clearTarget = () => {
      if (!activeTarget) return
      activeTarget.style.removeProperty('--pointer-x')
      activeTarget.style.removeProperty('--pointer-y')
      activeTarget.style.removeProperty('--pointer-rotate-x')
      activeTarget.style.removeProperty('--pointer-rotate-y')
      activeTarget.style.removeProperty('--pointer-needle-angle')
      activeTarget.querySelectorAll('.hero-float-chip').forEach((chip) => {
        chip.style.removeProperty('--chip-shift-x')
        chip.style.removeProperty('--chip-shift-y')
      })
      const art = activeTarget.querySelector('.hero-art')
      art?.style.removeProperty('--parallax-x')
      art?.style.removeProperty('--parallax-y')
      activeTarget.classList.remove('pointer-active')
      activeTarget = null
    }

    const update = () => {
      frame = 0
      const event = pendingEvent
      pendingEvent = null
      if (!event || document.hidden || event.pointerType !== 'mouse') return
      const nextTarget = event.target.closest(selector)
      if (!nextTarget || !root.contains(nextTarget)) return clearTarget()
      if (activeTarget !== nextTarget) clearTarget()
      activeTarget = nextTarget
      const bounds = nextTarget.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
      nextTarget.style.setProperty('--pointer-x', `${x * 100}%`)
      nextTarget.style.setProperty('--pointer-y', `${y * 100}%`)
      if (mode === 'hero') {
        nextTarget.style.setProperty('--pointer-needle-angle', `${((x - 0.5) * 12) - ((y - 0.5) * 5)}deg`)
        nextTarget.querySelectorAll('.hero-float-chip').forEach((chip, index) => {
          const strength = (index + 1) * 2
          chip.style.setProperty('--chip-shift-x', `${(x - 0.5) * strength}px`)
          chip.style.setProperty('--chip-shift-y', `${(y - 0.5) * strength}px`)
        })
        const art = nextTarget.querySelector('.hero-art')
        art?.style.setProperty('--parallax-x', `${(x - 0.5) * 5}px`)
        art?.style.setProperty('--parallax-y', `${(y - 0.5) * 5}px`)
      } else {
        nextTarget.style.setProperty('--pointer-rotate-x', `${(0.5 - y) * 3}deg`)
        nextTarget.style.setProperty('--pointer-rotate-y', `${(x - 0.5) * 3}deg`)
      }
      nextTarget.classList.add('pointer-active')
    }

    const onPointerMove = (event) => {
      if (event.pointerType !== 'mouse') return clearTarget()
      pendingEvent = event
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    const onPointerLeave = () => { pendingEvent = null; clearTarget() }
    const onVisibilityChange = () => { if (document.hidden) onPointerLeave() }

    root.addEventListener('pointermove', onPointerMove, { passive: true })
    root.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearTarget()
    }
  }, [mode, ref, reducedMotion, selector])
}
