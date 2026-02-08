'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, DollarSign, Ticket, UserCheck, TrendingUp } from 'lucide-react'

interface AdminStats {
  events: {
    total: number
    byStatus: {
      active: number
      draft: number
      completed: number
      cancelled: number
    }
  }
  users: {
    total: number
    byRole: {
      user: number
      creator: number
      admin: number
    }
    banned: number
  }
  revenue: {
    total: number
    thisMonth: number
  }
  tickets: {
    totalSold: number
  }
  organizers: {
    active: number
  }
}

interface AdminStatsCardsProps {
  stats: AdminStats | null
  isLoading: boolean
}

export default function AdminStatsCards({ stats, isLoading }: AdminStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              <div className="p-2 rounded-lg bg-muted animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 animate-pulse rounded bg-muted mb-2" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.events.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.events.byStatus.active} active, {stats.events.byStatus.draft} draft
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Users className="h-4 w-4 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.users.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.users.byRole.user} users, {stats.users.byRole.creator} creators, {stats.users.banned} banned
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <div className="p-2 rounded-lg bg-green-500/10">
            <DollarSign className="h-4 w-4 text-green-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.revenue.total)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(stats.revenue.thisMonth)} this month
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Ticket className="h-4 w-4 text-purple-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.tickets.totalSold}</div>
          <p className="text-xs text-muted-foreground mt-1">Total tickets sold</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Organizers</CardTitle>
          <div className="p-2 rounded-lg bg-orange-500/10">
            <UserCheck className="h-4 w-4 text-orange-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.organizers.active}</div>
          <p className="text-xs text-muted-foreground mt-1">Event organizers</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue Growth</CardTitle>
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.revenue.thisMonth)}</div>
          <p className="text-xs text-muted-foreground mt-1">This month's revenue</p>
        </CardContent>
      </Card>
    </div>
  )
}

