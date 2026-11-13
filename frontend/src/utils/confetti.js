/**
 * Lightweight canvas confetti trigger for high match scores or successful actions.
 * Zero external dependencies.
 */
export function fireConfetti(durationMs = 2600) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.inset = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.zIndex = '9999'
  canvas.style.pointerEvents = 'none'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }

  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr

  const colors = ['#2B50F5', '#6F88F8', '#FFB020', '#087654', '#8A2BE2', '#00D2FF', '#FF416C']
  const count = 75
  const particles = Array.from({ length: count }, () => ({
    x: canvas.width * (0.3 + Math.random() * 0.4),
    y: canvas.height * 0.4,
    vx: (Math.random() - 0.5) * 16 * dpr,
    vy: -(Math.random() * 14 + 8) * dpr,
    size: (Math.random() * 7 + 4) * dpr,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    opacity: 1,
  }))

  const startTime = performance.now()

  function frame(currentTime) {
    const elapsed = currentTime - startTime
    if (elapsed > durationMs) {
      canvas.remove()
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const progress = elapsed / durationMs
    const fade = progress > 0.7 ? (1 - progress) / 0.3 : 1

    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.45 * dpr // gravity
      p.vx *= 0.985 // drag
      p.rotation += p.rotationSpeed

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.globalAlpha = Math.max(0, p.opacity * fade)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx.restore()
    }

    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}
