import { useState, useCallback, useEffect } from 'react'

export type MenuPosition = 'right' | 'top'

export interface UseMenuReturn {
  menuPosition: MenuPosition
  isMenuMinimized: boolean
  toggleMenuPosition: () => void
  toggleMenuMinimize: () => void
}

export const useMenu = (): UseMenuReturn => {
  const [menuPosition, setMenuPosition] = useState<MenuPosition>('right')
  const [isMenuMinimized, setIsMenuMinimized] = useState(false)

  // Minimize menu automatically when accessing shared link
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const hasSharedId = urlParams.get('id')

    if (hasSharedId) {
      setIsMenuMinimized(true)
    }
  }, [])

  const toggleMenuPosition = useCallback(() => {
    setMenuPosition(prev => prev === 'right' ? 'top' : 'right')
  }, [])

  const toggleMenuMinimize = useCallback(() => {
    setIsMenuMinimized(prev => !prev)
  }, [])

  return {
    menuPosition,
    isMenuMinimized,
    toggleMenuPosition,
    toggleMenuMinimize
  }
}
