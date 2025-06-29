import { useState, useEffect } from 'react'
import { initializeAuth, onAuthChange } from '../firebase'

/**
 * Custom hook for managing Firebase authentication
 * Handles anonymous authentication and user state management
 */
export const useAuthManager = () => {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user)
      if (user) {
        console.log('🔥 User authenticated:', user.uid)
      } else {
        console.log('🔥 User not authenticated, signing in anonymously...')
        initializeAuth().catch(console.error)
      }
    })

    return () => unsubscribe()
  }, [])

  return {
    user,
    isAuthenticated: !!user
  }
}
