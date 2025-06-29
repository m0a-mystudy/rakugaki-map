import { useState, useCallback } from 'react'

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
