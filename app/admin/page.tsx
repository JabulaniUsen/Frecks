'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAllEvents,
  getAllUsers,
  getAllOrders,
  getAllTickets,
  getAllOrganizers,
  getAdminStats,
} from '@/lib/supabase/queries'
import AdminStatsCards from '@/components/admin/AdminStatsCards'
import AdminCharts from '@/components/admin/AdminCharts'
import AdminTables from '@/components/admin/AdminTables'
import AdminSidebar from '@/components/admin/AdminSidebar'
import WithdrawalsTable from '@/components/admin/WithdrawalsTable'
import { Loader2, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const ADMIN_EMAIL = 'jabulanietokakpan@gmail.com'

export default function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('dashboard')

  // Check if user is admin (memoize to prevent unnecessary re-renders)
  const isAdmin = useMemo(() => {
    return !!user && profile?.email === ADMIN_EMAIL
  }, [user, profile?.email])

  // Check admin access
  useEffect(() => {
    if (!authLoading) {
      if (!user || !profile) {
        router.replace('/auth/signin?redirect=/admin')
        return
      }
      if (profile.email !== ADMIN_EMAIL) {
        router.replace('/')
        return
      }
    }
  }, [user, profile, authLoading, router])

  // Fetch all admin data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    enabled: isAdmin,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: getAllEvents,
    enabled: isAdmin,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAllUsers,
    enabled: isAdmin,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: organizers, isLoading: organizersLoading } = useQuery({
    queryKey: ['admin-organizers'],
    queryFn: getAllOrganizers,
    enabled: isAdmin,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: getAllOrders,
    enabled: isAdmin,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: getAllTickets,
    enabled: isAdmin,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const isLoading = authLoading || statsLoading || eventsLoading || usersLoading || organizersLoading || ordersLoading || ticketsLoading

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    queryClient.invalidateQueries({ queryKey: ['admin-events'] })
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    queryClient.invalidateQueries({ queryKey: ['admin-organizers'] })
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
  }

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  // Check if user is authorized
  if (!user || !profile || profile.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You do not have permission to access the admin dashboard.
            </p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="p-6 lg:p-8">
          {/* Dashboard Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Welcome back, {profile?.full_name?.split(' ')[0] || 'Admin'}
                </h1>
                <p className="text-muted-foreground">
                  Monitor and manage all platform data, events, users, and revenue.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleRefresh} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Data
                </Button>
                <Button onClick={handleRefresh} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Create Report
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-8">
              {/* Stats Cards Section */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Overview</h2>
                <AdminStatsCards stats={stats} isLoading={statsLoading} />
              </div>

              {/* Charts Section */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Analytics & Insights</h2>
                <AdminCharts
                  events={events}
                  orders={orders}
                  tickets={tickets}
                  users={users}
                  isLoading={eventsLoading || ordersLoading || ticketsLoading || usersLoading}
                />
              </div>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events">
              <AdminTables
                events={events}
                users={users}
                organizers={organizers}
                orders={orders}
                tickets={tickets}
                isLoading={eventsLoading}
                onRefresh={handleRefresh}
                activeView="events"
              />
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <AdminTables
                events={events}
                users={users}
                organizers={organizers}
                orders={orders}
                tickets={tickets}
                isLoading={usersLoading}
                onRefresh={handleRefresh}
                activeView="users"
              />
            </TabsContent>

            {/* Organizers Tab */}
            <TabsContent value="organizers">
              <AdminTables
                events={events}
                users={users}
                organizers={organizers}
                orders={orders}
                tickets={tickets}
                isLoading={organizersLoading}
                onRefresh={handleRefresh}
                activeView="organizers"
              />
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <AdminTables
                events={events}
                users={users}
                organizers={organizers}
                orders={orders}
                tickets={tickets}
                isLoading={ordersLoading}
                onRefresh={handleRefresh}
                activeView="orders"
              />
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets">
              <AdminTables
                events={events}
                users={users}
                organizers={organizers}
                orders={orders}
                tickets={tickets}
                isLoading={ticketsLoading}
                onRefresh={handleRefresh}
                activeView="tickets"
              />
            </TabsContent>

            {/* Withdrawals Tab */}
            <TabsContent value="withdrawals">
              <div>
                <h2 className="text-xl font-semibold mb-4">Withdrawal Requests</h2>
                <WithdrawalsTable />
              </div>
            </TabsContent>

            {/* Ads Tab */}
            <TabsContent value="ads">
              <AdminTables
                events={events}
                users={users}
                organizers={organizers}
                orders={orders}
                tickets={tickets}
                isLoading={false}
                onRefresh={handleRefresh}
                activeView="ads"
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

