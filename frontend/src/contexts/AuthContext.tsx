import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { login as georideLogin, logout as georideLogout } from '../api/georide'
import { authenticateWithBackend } from '../api/backend'

type AuthState = {
  isAuthenticated: boolean
  georideUserId: number | null
  email: string | null
}

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function parseJwtPayload(token: string): { sub: number; georide_user_id: number } | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload)) as { sub: number; georide_user_id: number }
  } catch {
    return null
  }
}

function loadInitialState(): AuthState {
  const appToken = localStorage.getItem('app_token')
  const georideToken = sessionStorage.getItem('georide_token')
  if (appToken && georideToken) {
    const payload = parseJwtPayload(appToken)
    if (payload) {
      return {
        isAuthenticated: true,
        georideUserId: payload.georide_user_id,
        email: localStorage.getItem('user_email'),
      }
    }
  }
  return { isAuthenticated: false, georideUserId: null, email: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadInitialState)

  const login = useCallback(async (email: string, password: string) => {
    // Step 1: authenticate directly with GeoRide API (token stays in browser)
    const georideResult = await georideLogin(email, password)
    sessionStorage.setItem('georide_token', georideResult.authToken)

    // Step 2: exchange GeoRide token for our app JWT
    const appToken = await authenticateWithBackend(georideResult.authToken)
    localStorage.setItem('app_token', appToken)
    localStorage.setItem('user_email', georideResult.email)

    setState({
      isAuthenticated: true,
      georideUserId: georideResult.id,
      email: georideResult.email,
    })
  }, [])

  const logout = useCallback(async () => {
    try {
      await georideLogout()
    } catch {
      // best-effort
    }
    sessionStorage.removeItem('georide_token')
    localStorage.removeItem('app_token')
    localStorage.removeItem('user_email')
    setState({ isAuthenticated: false, georideUserId: null, email: null })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
