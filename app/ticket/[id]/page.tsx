'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTicketById, getTicketByQRCode } from '@/lib/supabase/queries'
import { validateTicket } from '@/lib/supabase/mutations'
import { Calendar, MapPin, CheckCircle2, XCircle, Loader2, Ticket, User, Mail } from 'lucide-react'
import { format } from 'date-fns'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

export default function TicketValidationPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const ticketId = params.id as string

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => getTicketById(ticketId),
    enabled: !!ticketId,
  })

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('You must be logged in to validate tickets')
      }
      if (!ticket) {
        throw new Error('Ticket not found')
      }
      return await validateTicket(ticket.id, user.id)
    },
    onSuccess: () => {
      toast.success('Ticket validated successfully!')
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to validate ticket')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto bg-card rounded-2xl border border-border p-8 text-center">
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Ticket Not Found</h1>
              <p className="text-muted-foreground mb-6">
                The ticket you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => router.push('/')}>Go to Home</Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const event = ticket.event
  const ticketType = ticket.ticket_type
  const isUsed = ticket.status === 'used'
  const isCancelled = ticket.status === 'cancelled'
  const isValid = ticket.status === 'valid'
  const canValidate = isValid && user && event?.creator_id === user.id

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Ticket Status Badge */}
            <div className="mb-6">
              {isValid && (
                <Badge className="bg-green-500 text-white text-lg px-4 py-2">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Valid
                </Badge>
              )}
              {isUsed && (
                <Badge className="bg-blue-500 text-white text-lg px-4 py-2">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Validated
                </Badge>
              )}
              {isCancelled && (
                <Badge className="bg-red-500 text-white text-lg px-4 py-2">
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelled
                </Badge>
              )}
            </div>

            {/* Ticket Details Card */}
            <div className="bg-card rounded-2xl border border-border p-8 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Ticket className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Ticket Details</h1>
                  <p className="text-sm text-muted-foreground font-mono">
                    ID: {ticket.id.slice(0, 8)}...
                  </p>
                </div>
              </div>

              {/* Ticket Type */}
              <div className="mb-6 pb-6 border-b border-border">
                <h2 className="text-xl font-semibold mb-2">{ticketType?.name || 'General Admission'}</h2>
                {ticketType?.description && (
                  <p className="text-muted-foreground">{ticketType.description}</p>
                )}
                <div className="mt-3">
                  <Badge variant="outline" className="text-lg">
                    {ticketType?.is_free ? 'Free' : `₦${Number(ticketType?.price || 0).toLocaleString()}`}
                  </Badge>
                </div>
              </div>

              {/* Event Information */}
              {event && (
                <div className="mb-6 pb-6 border-b border-border">
                  <h3 className="text-lg font-semibold mb-4">Event Information</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-xl mb-2">{event.title}</h4>
                      <Badge className="mb-3">{event.category}</Badge>
                    </div>
                    
                    {event.description && (
                      <p className="text-muted-foreground">{event.description}</p>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">Date & Time</p>
                          <p className="font-semibold">
                            {format(new Date(event.date), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="font-semibold">{event.location}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket Holder Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Ticket Holder</h3>
                <div className="space-y-3">
                  {ticket.order_id && (
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Order ID</p>
                        <p className="font-semibold font-mono text-sm">{ticket.order_id}</p>
                      </div>
                    </div>
                  )}
                  
                  {ticket.checked_in_at && (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Validated At</p>
                        <p className="font-semibold">
                          {format(new Date(ticket.checked_in_at), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Validation Button (Only for event creators) */}
              {canValidate && (
                <div className="pt-6 border-t border-border">
                  <Button
                    onClick={() => validateMutation.mutate()}
                    disabled={validateMutation.isPending || isUsed}
                    className="w-full"
                    size="lg"
                    variant="hero"
                  >
                    {validateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : isUsed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Already Validated
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Validate Ticket
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Message for non-creators */}
              {!canValidate && isValid && user && event?.creator_id !== user.id && (
                <div className="pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    Only the event creator can validate tickets.
                  </p>
                </div>
              )}

              {/* Message for unauthenticated users */}
              {!user && (
                <div className="pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Please log in as the event creator to validate this ticket.
                  </p>
                  <Button
                    onClick={() => router.push('/auth/signin')}
                    variant="outline"
                    className="w-full"
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </div>

            {/* Back Button */}
            <div className="text-center">
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

