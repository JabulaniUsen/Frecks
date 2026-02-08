'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { MoreVertical, Trash2, Edit, Eye, Ban, UserCheck, Shield, Megaphone } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import AdminActions from './AdminActions'

interface AdminTablesProps {
  events: any[] | null
  users: any[] | null
  organizers: any[] | null
  orders: any[] | null
  tickets: any[] | null
  isLoading: boolean
  onRefresh: () => void
  activeView?: 'events' | 'users' | 'organizers' | 'orders' | 'tickets' | 'ads'
}

export default function AdminTables({ events, users, organizers, orders, tickets, isLoading, onRefresh, activeView }: AdminTablesProps) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'delete-event' | 'ban-user' | 'change-role' | 'change-status' | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate revenue per event
  const getEventRevenue = (eventId: string) => {
    if (!orders) return 0
    return orders
      .filter((o: any) => o.event_id === eventId && o.payment_status === 'paid')
      .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount || 0), 0)
  }

  // Calculate tickets sold per event
  const getEventTicketsSold = (eventId: string) => {
    if (!tickets) return 0
    return tickets.filter((t: any) => t.event_id === eventId).length
  }

  // Get organizer stats
  const getOrganizerStats = (organizerId: string) => {
    if (!events || !orders) return { eventsCreated: 0, totalRevenue: 0 }
    const organizerEvents = events.filter((e: any) => e.creator_id === organizerId)
    const totalRevenue = orders
      .filter((o: any) => organizerEvents.some((e: any) => e.id === o.event_id) && o.payment_status === 'paid')
      .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount || 0), 0)
    return {
      eventsCreated: organizerEvents.length,
      totalRevenue,
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading data...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  // Helper function to render table based on activeView
  const renderTable = () => {
    if (activeView === 'events') {
      return (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">All Events ({events?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tickets Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events && events.length > 0 ? (
                    events.map((event: any) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>
                          {event.creator?.full_name || event.creator?.email || 'Unknown'}
                        </TableCell>
                        <TableCell>{format(new Date(event.date), 'MMM d, yyyy h:mm a')}</TableCell>
                        <TableCell>
                          <Badge variant={
                            event.status === 'active' ? 'default' :
                            event.status === 'completed' ? 'secondary' :
                            event.status === 'cancelled' ? 'destructive' : 'outline'
                          }>
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{getEventTicketsSold(event.id)}</TableCell>
                        <TableCell>{formatCurrency(getEventRevenue(event.id))}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/event/${event.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedEvent(event.id)
                                  setActionType('change-status')
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Change Status
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedEvent(event.id)
                                  setActionType('delete-event')
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No events found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (activeView === 'users') {
      return (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">All Users ({users?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users && users.length > 0 ? (
                    users.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : user.role === 'creator' ? 'secondary' : 'outline'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.school || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(user.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {user.banned ? (
                            <Badge variant="destructive">Banned</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user.id)
                                  setActionType('change-role')
                                }}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user.id)
                                  setActionType('ban-user')
                                }}
                                className="text-destructive"
                              >
                                {user.banned ? (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Unban User
                                  </>
                                ) : (
                                  <>
                                    <Ban className="mr-2 h-4 w-4" />
                                    Ban User
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (activeView === 'organizers') {
      return (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">All Organizers ({organizers?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Events Created</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizers && organizers.length > 0 ? (
                    organizers.map((organizer: any) => {
                      const stats = getOrganizerStats(organizer.id)
                      return (
                        <TableRow key={organizer.id}>
                          <TableCell className="font-medium">{organizer.full_name || 'N/A'}</TableCell>
                          <TableCell>{organizer.email}</TableCell>
                          <TableCell>{organizer.school || 'N/A'}</TableCell>
                          <TableCell>
                            {organizer.creator_profile?.bank_account_name ? (
                              <div className="text-sm">
                                <div>{organizer.creator_profile.bank_account_name}</div>
                                <div className="text-muted-foreground">
                                  {organizer.creator_profile.bank_name} • {organizer.creator_profile.bank_account_number?.slice(-4)}
                                </div>
                              </div>
                            ) : (
                              'Not set'
                            )}
                          </TableCell>
                          <TableCell>{stats.eventsCreated}</TableCell>
                          <TableCell>{formatCurrency(stats.totalRevenue)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/creator?userId=${organizer.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Profile
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No organizers found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (activeView === 'orders') {
      return (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">All Orders ({orders?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders && orders.length > 0 ? (
                    orders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                        <TableCell>{order.event?.title || 'Unknown Event'}</TableCell>
                        <TableCell>
                          {order.user?.full_name || order.full_name || order.email}
                        </TableCell>
                        <TableCell>{formatCurrency(parseFloat(order.total_amount || 0))}</TableCell>
                        <TableCell>
                          <Badge variant={
                            order.payment_status === 'paid' ? 'default' :
                            order.payment_status === 'pending' ? 'secondary' :
                            order.payment_status === 'failed' ? 'destructive' : 'outline'
                          }>
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/invoice/${order.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (activeView === 'tickets') {
      return (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">All Tickets ({tickets?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets && tickets.length > 0 ? (
                    tickets.map((ticket: any) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs">{ticket.id.slice(0, 8)}...</TableCell>
                        <TableCell>{ticket.event?.title || 'Unknown Event'}</TableCell>
                        <TableCell>
                          {ticket.user?.full_name || ticket.user?.email || 'Guest'}
                        </TableCell>
                        <TableCell>
                          {ticket.ticket_type?.name || 'N/A'} ({ticket.ticket_type?.is_free ? 'Free' : formatCurrency(ticket.ticket_type?.price || 0)})
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            ticket.status === 'valid' ? 'default' :
                            ticket.status === 'used' ? 'secondary' :
                            'destructive'
                          }>
                            {ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/invoice/${ticket.order_id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No tickets found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (activeView === 'ads') {
      return (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Advertisement Management</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="rounded-full bg-primary/10 p-6 mb-6">
                <Megaphone className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Coming Soon</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Advertisement management features are currently under development. 
                You'll be able to create, manage, and monitor ads for your platform soon.
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-sm">
                  In Development
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return null
  }

  return (
    <>
      {renderTable()}

      {/* Action Dialogs */}
      <AdminActions
        actionType={actionType}
        selectedEvent={selectedEvent}
        selectedUser={selectedUser}
        onClose={() => {
          setActionType(null)
          setSelectedEvent(null)
          setSelectedUser(null)
        }}
        onSuccess={() => {
          onRefresh()
          setActionType(null)
          setSelectedEvent(null)
          setSelectedUser(null)
        }}
      />
    </>
  )
}

