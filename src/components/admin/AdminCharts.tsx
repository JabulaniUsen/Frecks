'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from 'recharts'
import { useMemo } from 'react'

interface AdminChartsProps {
  events: any[] | null
  orders: any[] | null
  tickets: any[] | null
  users: any[] | null
  isLoading: boolean
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

export default function AdminCharts({ events, orders, tickets, users, isLoading }: AdminChartsProps) {
  // Revenue over time (last 30 days)
  const revenueOverTime = useMemo(() => {
    if (!orders) return []
    
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return {
        date: date.toISOString().split('T')[0],
        revenue: 0,
      }
    })

    orders.forEach((order: any) => {
      if (order.payment_status === 'paid') {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0]
        const dayData = last30Days.find(d => d.date === orderDate)
        if (dayData) {
          dayData.revenue += parseFloat(order.total_amount || 0)
        }
      }
    })

    return last30Days.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: d.revenue,
    }))
  }, [orders])

  // Events by category
  const eventsByCategory = useMemo(() => {
    if (!events) return []
    
    const categoryMap = new Map<string, number>()
    events.forEach((event: any) => {
      const category = event.category || 'Other'
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
    })

    return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }))
  }, [events])

  // Revenue by event (top 10)
  const revenueByEvent = useMemo(() => {
    if (!orders || !events) return []
    
    const eventRevenueMap = new Map<string, { name: string; revenue: number }>()
    
    orders.forEach((order: any) => {
      if (order.payment_status === 'paid') {
        const eventId = order.event_id
        const eventTitle = order.event?.title || 'Unknown Event'
        const current = eventRevenueMap.get(eventId) || { name: eventTitle, revenue: 0 }
        current.revenue += parseFloat(order.total_amount || 0)
        eventRevenueMap.set(eventId, current)
      }
    })

    return Array.from(eventRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(item => ({
        name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
        revenue: item.revenue,
      }))
  }, [orders, events])

  // Tickets sold over time
  const ticketsOverTime = useMemo(() => {
    if (!tickets) return []
    
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return {
        date: date.toISOString().split('T')[0],
        tickets: 0,
      }
    })

    tickets.forEach((ticket: any) => {
      const ticketDate = new Date(ticket.created_at).toISOString().split('T')[0]
      const dayData = last30Days.find(d => d.date === ticketDate)
      if (dayData) {
        dayData.tickets++
      }
    })

    return last30Days.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tickets: d.tickets,
    }))
  }, [tickets])

  // User growth over time
  const userGrowth = useMemo(() => {
    if (!users) return []
    
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return {
        date: date.toISOString().split('T')[0],
        users: 0,
        cumulative: 0,
      }
    })

    let cumulative = 0
    users.forEach((user: any) => {
      const userDate = new Date(user.created_at).toISOString().split('T')[0]
      const dayData = last30Days.find(d => d.date === userDate)
      if (dayData) {
        dayData.users++
      }
    })

    // Calculate cumulative
    last30Days.forEach(day => {
      cumulative += day.users
      day.cumulative = cumulative
    })

    return last30Days.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      users: d.users,
      cumulative: d.cumulative,
    }))
  }, [users])

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Revenue over time */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Revenue Over Time (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' } }}>
            <LineChart data={revenueOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Events by category */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Events by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={Object.fromEntries(eventsByCategory.map((item, i) => [item.name, { label: item.name, color: COLORS[i % COLORS.length] }]))}>
            <PieChart>
              <Pie
                data={eventsByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {eventsByCategory.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Revenue by event */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Top 10 Events by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ revenue: { label: 'Revenue', color: 'hsl(var(--chart-2))' } }}>
            <BarChart data={revenueByEvent}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="revenue" fill="hsl(var(--chart-2))" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Tickets sold over time */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Tickets Sold Over Time (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ tickets: { label: 'Tickets', color: 'hsl(var(--chart-3))' } }}>
            <AreaChart data={ticketsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="tickets" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.6} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* User growth */}
      <Card className="md:col-span-2 hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">User Growth (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ 
            users: { label: 'New Users', color: 'hsl(var(--chart-4))' },
            cumulative: { label: 'Total Users', color: 'hsl(var(--chart-5))' }
          }}>
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line type="monotone" dataKey="users" stroke="hsl(var(--chart-4))" strokeWidth={2} name="New Users" />
              <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--chart-5))" strokeWidth={2} name="Total Users" />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

