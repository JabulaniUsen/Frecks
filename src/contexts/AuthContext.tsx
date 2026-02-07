'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'creator' | 'admin'
  gender: string | null
  school: string | null
  avatar_name: string | null
  avatar_url: string | null
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef<string | null>(null)

  const fetchProfile = async (userId: string) => {
    // Prevent duplicate fetches
    if (fetchingRef.current === userId) return
    fetchingRef.current = userId

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, gender, school, avatar_name, avatar_url')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data) {
        setProfile({
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role || 'user',
          gender: data.gender || null,
          school: data.school || null,
          avatar_name: data.avatar_name || null,
          avatar_url: data.avatar_url || null,
        })
      } else {
        setProfile(null)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    } finally {
      fetchingRef.current = null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      fetchingRef.current = null // Reset to allow refresh
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    let mounted = true
    let currentUserId: string | null = null

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return

      if (error) {
        setLoading(false)
        return
      }

      setSession(session)
      setUser(session?.user ?? null)
      currentUserId = session?.user?.id ?? null
      
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      
      if (mounted) {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return

      const newUserId = session?.user?.id ?? null
      
      // Only update if user actually changed
      if (newUserId !== currentUserId) {
        setSession(session)
        setUser(session?.user ?? null)
        currentUserId = newUserId
        
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    fetchingRef.current = null
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

