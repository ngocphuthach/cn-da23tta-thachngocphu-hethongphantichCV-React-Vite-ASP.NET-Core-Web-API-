import { useEffect } from 'react'

export function usePageVisibility() {
  useEffect(() => {
    const update = () => document.documentElement.classList.toggle('page-hidden', document.hidden)
    update()
    document.addEventListener('visibilitychange', update)
    return () => {
      document.removeEventListener('visibilitychange', update)
      document.documentElement.classList.remove('page-hidden')
    }
  }, [])
}
