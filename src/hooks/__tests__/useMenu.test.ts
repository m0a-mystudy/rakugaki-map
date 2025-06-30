import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMenu } from '../useMenu'

describe('useMenu', () => {
  let originalLocation: Location

  beforeEach(() => {
    originalLocation = window.location
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true
    })
  })

  it('initializes with default values', () => {
    const { result } = renderHook(() => useMenu())

    expect(result.current.menuPosition).toBe('right')
    expect(result.current.isMenuMinimized).toBe(false)
  })

  it('automatically minimizes menu when shared link is accessed', () => {
    // Mock window.location with id parameter
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        search: '?id=test-drawing-id'
      },
      writable: true
    })

    const { result } = renderHook(() => useMenu())

    expect(result.current.menuPosition).toBe('right')
    expect(result.current.isMenuMinimized).toBe(true)
  })

  it('does not minimize menu when no id parameter is present', () => {
    // Mock window.location without id parameter
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        search: ''
      },
      writable: true
    })

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
