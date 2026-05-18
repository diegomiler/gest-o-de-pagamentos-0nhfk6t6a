import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'

interface AuthContextType {
  user: any
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (data: {
    name: string
    email: string
    password: string
    company_name: string
  }) => Promise<{ error: any }>
  signOut: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(pb.authStore.record)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password)
      try {
        await pb.collection('access_logs').create({
          email: authData.record.email,
          user_id: authData.record.id,
          access_time: new Date().toISOString(),
        })
      } catch (logError) {
        console.error('Failed to log access', logError)
      }
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signUp = async (data: {
    name: string
    email: string
    password: string
    company_name: string
  }) => {
    try {
      await pb.send('/backend/v1/register', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      })
      const authData = await pb.collection('users').authWithPassword(data.email, data.password)
      try {
        await pb.collection('access_logs').create({
          email: authData.record.email,
          user_id: authData.record.id,
          access_time: new Date().toISOString(),
        })
      } catch (logError) {
        console.error('Failed to log access', logError)
      }
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
