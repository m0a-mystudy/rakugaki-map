import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuthManager } from '../useAuthManager'

// Mock firebase module
vi.mock('../../firebase', () => ({
  initializeAuth: vi.fn().mockResolvedValue({ uid: 'test-user-id' }),
  onAuthChange: vi.fn().mockImplementation((callback) => {
    // Simulate auth state change
    setTimeout(() => callback({ uid: 'test-user-id' }), 0)
    return () => {} // unsubscribe function
  })
}))

describe('useAuthManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with null user', () => {
    const { result } = renderHook(() => useAuthManager())

    expect(result.current.user).toBeNull()
  })

  it('updates user when auth state changes', async () => {
    const { result } = renderHook(() => useAuthManager())

    await waitFor(() => {
      expect(result.current.user).toEqual({ uid: 'test-user-id' })
    })
  })

  it('cleans up auth listener on unmount', async () => {
    const unsubscribeMock = vi.fn()
    const { onAuthChange } = vi.mocked(await import('../../firebase'))
    onAuthChange.mockReturnValue(unsubscribeMock)

    const { unmount } = renderHook(() => useAuthManager())

    unmount()

    expect(unsubscribeMock).toHaveBeenCalled()
  })

  it('initializes auth when user is not authenticated', async () => {
    const { onAuthChange, initializeAuth } = vi.mocked(await import('../../firebase'))

    // Simulate no user initially
    onAuthChange.mockImplementation((callback: (user: any) => void) => {
      callback(null) // No user
      return () => {}
    })

    renderHook(() => useAuthManager())

    await waitFor(() => {
      expect(initializeAuth).toHaveBeenCalled()
    })
  })

  it('does not initialize auth when user is already authenticated', async () => {
    const { onAuthChange, initializeAuth } = vi.mocked(await import('../../firebase'))

    // Simulate user already authenticated
    onAuthChange.mockImplementation((callback: (user: any) => void) => {
      callback({ uid: 'existing-user' })
      return () => {}
    })

    renderHook(() => useAuthManager())

    await waitFor(() => {
      expect(initializeAuth).not.toHaveBeenCalled()
    })
  })
})
