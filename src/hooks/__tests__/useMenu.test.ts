import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMenu } from '../useMenu'

describe('useMenu', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useMenu())

    expect(result.current.menuPosition).toBe('right')
    expect(result.current.isMenuMinimized).toBe(false)
  })

  it('toggles menu position between right and top', () => {
    const { result } = renderHook(() => useMenu())

    expect(result.current.menuPosition).toBe('right')

    act(() => {
      result.current.toggleMenuPosition()
    })

    expect(result.current.menuPosition).toBe('top')

    act(() => {
      result.current.toggleMenuPosition()
    })

    expect(result.current.menuPosition).toBe('right')
  })

  it('toggles menu minimized state', () => {
    const { result } = renderHook(() => useMenu())

    expect(result.current.isMenuMinimized).toBe(false)

    act(() => {
      result.current.toggleMenuMinimize()
    })

    expect(result.current.isMenuMinimized).toBe(true)

    act(() => {
      result.current.toggleMenuMinimize()
    })

    expect(result.current.isMenuMinimized).toBe(false)
  })

  it('maintains callback references across renders', () => {
    const { result, rerender } = renderHook(() => useMenu())

    const togglePosition1 = result.current.toggleMenuPosition
    const toggleMinimize1 = result.current.toggleMenuMinimize

    rerender()

    const togglePosition2 = result.current.toggleMenuPosition
    const toggleMinimize2 = result.current.toggleMenuMinimize

    expect(togglePosition1).toBe(togglePosition2)
    expect(toggleMinimize1).toBe(toggleMinimize2)
  })
})
