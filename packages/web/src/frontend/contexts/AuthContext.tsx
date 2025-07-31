import React, { createContext, useContext, useEffect, useState } from 'react'
import { CognitoUser, CognitoUserPool, AuthenticationDetails, CognitoUserSession } from 'amazon-cognito-identity-js'

interface User {
  id: string
  email: string
  name: string
  roles: string[]
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (email: string, password: string, name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const userPool = new CognitoUserPool({
  UserPoolId: process.env.VITE_COGNITO_USER_POOL_ID || '',
  ClientId: process.env.VITE_COGNITO_CLIENT_ID || '',
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    try {
      const cognitoUser = userPool.getCurrentUser()
      if (cognitoUser) {
        cognitoUser.getSession((err: any, session: CognitoUserSession) => {
          if (err) {
            setLoading(false)
            return
          }
          
          if (session.isValid()) {
            const payload = session.getIdToken().getPayload()
            setUser({
              id: payload.sub,
              email: payload.email,
              name: payload.name || payload.email,
              roles: payload['custom:roles']?.split(',') || ['user']
            })
          }
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error checking auth state:', error)
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    })

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    })

    return new Promise<void>((resolve, reject) => {
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session) => {
          const payload = session.getIdToken().getPayload()
          setUser({
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload.email,
            roles: payload['custom:roles']?.split(',') || ['user']
          })
          resolve()
        },
        onFailure: (err) => {
          reject(err)
        },
      })
    })
  }

  const logout = () => {
    const cognitoUser = userPool.getCurrentUser()
    if (cognitoUser) {
      cognitoUser.signOut()
    }
    setUser(null)
  }

  const register = async (email: string, password: string, name: string) => {
    return new Promise<void>((resolve, reject) => {
      userPool.signUp(
        email,
        password,
        [
          {
            Name: 'email',
            Value: email,
          },
          {
            Name: 'name',
            Value: name,
          },
        ],
        [],
        (err, result) => {
          if (err) {
            reject(err)
            return
          }
          resolve()
        }
      )
    })
  }

  const value = {
    user,
    loading,
    login,
    logout,
    register,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}