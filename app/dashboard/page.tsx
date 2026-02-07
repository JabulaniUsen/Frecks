'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function DashboardRedirect() {
  const { profile, loading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect once loading is complete
    if (!loading) {
      if (!user || !profile) {
        // Not authenticated, redirect to sign in
        // Check if we're already on sign-in page to prevent loops
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/signin')) {
          router.replace('/auth/signin?redirect=/dashboard')
        }
        return
      }

      // Authenticated, redirect based on role
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        if (profile.role === 'creator' && currentPath !== '/dashboard/creator') {
          router.replace('/dashboard/creator')
        } else if (profile.role !== 'creator' && currentPath !== '/dashboard/user') {
          router.replace('/dashboard/user')
        }
      }
    }
  }, [profile, loading, user, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="mb-2 text-lg font-semibold">Authentication Required</p>
          <p className="text-sm text-muted-foreground mb-4">Please sign in to access your dashboard.</p>
          <Link href="/auth/signin">
            <Button variant="hero">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}

