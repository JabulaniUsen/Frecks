'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getEventById, getEventAnalytics } from '@/lib/supabase/queries'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Calendar, DollarSign, Ticket, Users, TrendingUp, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'

export default function EventAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const { profile, user } = useAuth()

  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEventById(eventId),
    enabled: !!eventId,
  })

  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['event-analytics', eventId],
    queryFn: () => getEventAnalytics(eventId),
    enabled: !!eventId,
  })

  if (!profile || profile.role !== 'creator') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-2">Access Denied</p>
          <p className="text-sm text-muted-foreground">Only creators can view analytics.</p>
        </div>
      </div>
    )
  }

  if (isLoadingEvent || isLoadingAnalytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-2">Event not found</p>
          <Link href="/dashboard/creator">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const orders = analyticsData?.orders || []
  const tickets = analyticsData?.tickets || []
  const ticketTypes = eventData.ticket_types || []

  // Service charge constant (company fee, not part of creator revenue)
  const SERVICE_CHARGE = 200

  // Calculate statistics
  const totalTicketsSold = tickets.length
  const totalTicketsAvailable = ticketTypes.reduce((sum: number, tt: any) => sum + (tt.quantity || 0), 0)
  // Calculate revenue excluding service charge (200 naira per order)
  const totalRevenue = orders.reduce((sum: number, order: any) => {
    const orderTotal = parseFloat(order.total_amount) || 0
    // Subtract service charge from each order to get creator's revenue
    return sum + Math.max(0, orderTotal - SERVICE_CHARGE)
  }, 0)
  const totalOrders = orders.length
  const checkedInTickets = tickets.filter((t: any) => t.status === 'used').length
  const pendingTickets = tickets.filter((t: any) => t.status === 'valid').length

  // Revenue by ticket type
  const revenueByTicketType = ticketTypes.map((tt: any) => {
    const ticketsForType = tickets.filter((t: any) => t.ticket_type_id === tt.id)
    const revenue = ticketsForType.length * (tt.price || 0)
    return {
      name: tt.name,
      sold: ticketsForType.length,
      revenue,
      price: tt.price || 0,
    }
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/creator">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Event Analytics</h1>
                <p className="text-sm text-muted-foreground">{eventData.title}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/dashboard/creator/edit/${eventId}`}>
                <Button variant="outline">Edit Event</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Event Overview */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {eventData.image_url && (
              <img
                src={eventData.image_url}
                alt={eventData.title}
                className="w-full md:w-64 h-48 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{eventData.title}</h2>
                  <Badge className={eventData.status === 'active' ? 'bg-primary' : 'bg-muted'}>
                    {eventData.status}
                  </Badge>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">{eventData.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date & Time</p>
                  <p className="font-medium">
                    {format(new Date(eventData.date), 'MMM d, yyyy • h:mm a')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{eventData.location}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{eventData.category}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Ticket className="w-6 h-6 text-primary" />
              </div>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="text-2xl font-bold mb-1">{totalTicketsSold}</div>
            <div className="text-sm text-muted-foreground">Tickets Sold</div>
            <div className="text-xs text-muted-foreground mt-2">
              {totalTicketsAvailable > 0 
                ? `${Math.round((totalTicketsSold / totalTicketsAvailable) * 100)}% of ${totalTicketsAvailable}`
                : 'No tickets available'}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold mb-1">₦{totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-xs text-muted-foreground mt-2">
              {totalOrders} {totalOrders === 1 ? 'order' : 'orders'}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold mb-1">{checkedInTickets}</div>
            <div className="text-sm text-muted-foreground">Checked In</div>
            <div className="text-xs text-muted-foreground mt-2">
              {pendingTickets} pending
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold mb-1">{totalOrders}</div>
            <div className="text-sm text-muted-foreground">Total Orders</div>
            <div className="text-xs text-muted-foreground mt-2">
              All paid
            </div>
          </div>
        </div>

        {/* Revenue by Ticket Type */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Revenue by Ticket Type</h3>
          <div className="space-y-4">
            {revenueByTicketType.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.sold} sold @ ₦{item.price.toLocaleString()} each
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      ₦{item.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
                {totalTicketsAvailable > 0 && (
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(item.sold / totalTicketsAvailable) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ticket Types Breakdown */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Ticket Types Breakdown</h3>
          <div className="space-y-4">
            {ticketTypes.map((tt: any, index: number) => {
              const ticketsForType = tickets.filter((t: any) => t.ticket_type_id === tt.id)
              const sold = ticketsForType.length
              const available = tt.quantity || 0
              const percentage = available > 0 ? (sold / available) * 100 : 0

              return (
                <div key={tt.id || index} className="p-4 border border-border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{tt.name}</p>
                      {tt.description && (
                        <p className="text-sm text-muted-foreground mt-1">{tt.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {tt.price === 0 ? 'Free' : `₦${tt.price.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>{sold} / {available} sold</span>
                    <span>{Math.round(percentage)}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-xl font-bold mb-4">Recent Orders</h3>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-4">
              {orders.slice(0, 10).map((order: any) => (
                <div key={order.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{order.full_name}</p>
                      <p className="text-sm text-muted-foreground">{order.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(order.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div>
                        <p className="font-bold text-primary">
                          ₦{Math.max(0, parseFloat(order.total_amount || 0) - SERVICE_CHARGE).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground line-through">
                          ₦{parseFloat(order.total_amount || 0).toLocaleString()} (includes service charge)
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.tickets?.length || 0} {order.tickets?.length === 1 ? 'ticket' : 'tickets'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

