'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Ticket, Calendar, ArrowRight, MapPin, Download, Loader2, Sparkles } from 'lucide-react'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { getUserTickets } from '@/lib/supabase/queries'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export default function UserDashboard() {
  const { profile, loading, user, refreshProfile } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  // All hooks must be called before any conditional returns
  const { data: myTickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['user-tickets', user?.id],
    queryFn: () => getUserTickets(user!.id),
    enabled: !!user?.id && !loading,
  })

  const becomeCreatorMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      
      // Update user role to creator
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'creator' })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Create creator profile if it doesn't exist
      const { data: existingProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('creator_profiles')
          .insert({ user_id: user.id })

        if (profileError) throw profileError
      }

      // Refresh profile to get updated role
      await refreshProfile()
    },
    onSuccess: () => {
      toast.success('You are now an event organizer!')
      queryClient.invalidateQueries({ queryKey: ['user-tickets'] })
      router.push('/dashboard/creator')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to become event organizer')
    },
  })

  useEffect(() => {
    if (!loading) {
      if (!user || !profile) {
        router.replace('/auth/signin?redirect=/dashboard/user')
        return
      }
      if (profile.role === 'creator') {
        router.replace('/dashboard/creator')
        return
      }
    }
  }, [profile, loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || profile.role !== 'user') {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Tickets</h1>
              <p className="text-muted-foreground">
                Welcome back, {profile?.full_name || 'User'}! Here are your tickets.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => becomeCreatorMutation.mutate()}
              disabled={becomeCreatorMutation.isPending}
              className="gap-2 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              {becomeCreatorMutation.isPending ? 'Upgrading...' : 'Become Event Organizer'}
            </Button>
          </div>

          {ticketsLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading your tickets...</p>
            </div>
          ) : !myTickets || myTickets.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No tickets yet</h2>
              <p className="text-muted-foreground mb-6">
                Start exploring events and get your tickets!
              </p>
              <Link href="/">
                <Button variant="hero">Browse Events</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {myTickets.map((ticket: any) => {
                const event = ticket.event
                const ticketType = ticket.ticket_type
                const qrCodeImage = ticket.qr_code_data?.qrCodeImageUrl || ticket.qr_code_data?.qrCodeImage

                return (
                  <div key={ticket.id} className="bg-card rounded-xl border border-border p-4 md:p-6 hover:shadow-lg transition-shadow">
                    <div className="flex gap-3 md:gap-4">
                      {event?.image_url && (
                        <div className="w-20 h-20 md:w-32 md:h-32 rounded-lg overflow-hidden bg-muted shrink-0">
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base md:text-xl font-bold mb-1 truncate">{event?.title || 'Event'}</h3>
                            <Badge className="text-xs">{event?.category || 'Event'}</Badge>
                          </div>
                          <Badge variant={ticket.status === 'valid' ? 'default' : ticket.status === 'used' ? 'secondary' : 'destructive'} className="shrink-0 text-xs">
                            {ticket.status === 'valid' ? 'Valid' : ticket.status === 'used' ? 'Used' : 'Cancelled'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                            <span className="truncate">{event?.date ? format(new Date(event.date), 'MMM d, yyyy • h:mm a') : 'Date TBD'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                            <span className="truncate">{event?.location || 'Location TBD'}</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground">Ticket Type</p>
                            <p className="text-sm md:text-base font-semibold">{ticketType?.name || 'General Admission'}</p>
                            {ticketType?.price !== undefined && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {ticketType.is_free ? 'Free' : `₦${ticketType.price}`}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/invoice/${ticket.order_id}`} className="flex-1 sm:flex-initial">
                              <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
                                See Ticket
                              </Button>
                            </Link>
                            {qrCodeImage && (
                              <Link href={`/invoice/${ticket.order_id}`} className="flex-1 sm:flex-initial">
                                <Button variant="hero" size="sm" className="w-full sm:w-auto gap-2 text-xs">
                                  <Download className="w-3 h-3 md:w-4 md:h-4" />
                                  <span className="hidden sm:inline">Download</span>
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

