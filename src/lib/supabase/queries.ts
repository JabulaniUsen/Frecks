import { supabase } from '../supabase'

// Event queries
export const getEvents = async () => {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('status', 'active')
    .gte('date', now) // Only get events that haven't passed
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const getFilteredEvents = async (filters: {
  search?: string
  category?: string
  location?: string
  dateFrom?: string
  dateTo?: string
  school?: string
}) => {
  const now = new Date().toISOString()
  let query = supabase
    .from('events')
    .select('*, ticket_types(*), creator:users!events_creator_id_fkey(school)')
    .eq('status', 'active')
    .gte('date', now) // Only get events that haven't passed

  // Apply search filter (searches in title and description)
  if (filters.search && filters.search.trim()) {
    const searchTerm = filters.search.trim().replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
  }

  // Apply category filter
  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  // Apply location filter
  if (filters.location && filters.location.trim()) {
    query = query.ilike('location', `%${filters.location}%`)
  }

  // Apply date range filters
  if (filters.dateFrom) {
    query = query.gte('date', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('date', filters.dateTo)
  }

  query = query.order('date', { ascending: true }) // Order by date ascending (soonest first)

  const { data, error } = await query

  if (error) throw error

  // Apply school filter after fetching (since Supabase doesn't support nested filtering easily)
  let filteredData = data || []
  if (filters.school && filters.school !== 'all') {
    filteredData = filteredData.filter((event: any) => {
      const creator = event.creator as any
      return creator?.school === filters.school
    })
  }

  return filteredData
}

export const getPastEvents = async () => {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('status', 'active')
    .lt('date', now) // Only get events that have passed
    .order('date', { ascending: false })

  if (error) throw error
  return data
}

export const getEventById = async (id: string) => {
  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Ticket type queries
export const getTicketTypesByEventId = async (eventId: string) => {
  const { data, error } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)

  if (error) throw error
  return data
}

// Order queries
export const getOrderById = async (id: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, event:events(*), tickets(*, ticket_type:ticket_types(*))')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export const getUserOrders = async (userId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, event:events(*), tickets(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Ticket queries
export const getTicketById = async (id: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, event:events(*), ticket_type:ticket_types(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export const getTicketByQRCode = async (qrCode: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, event:events(*), ticket_type:ticket_types(*)')
    .eq('qr_code', qrCode)
    .single()

  if (error) throw error
  return data
}

export const getUserTickets = async (userId: string) => {
  // First get all paid orders for the user
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .eq('payment_status', 'paid')

  if (ordersError) throw ordersError

  if (!orders || orders.length === 0) {
    return []
  }

  const orderIds = orders.map(o => o.id)

  // Then get tickets for those orders
  const { data, error } = await supabase
    .from('tickets')
    .select('*, event:events(*), ticket_type:ticket_types(*), order:orders(*)')
    .eq('user_id', userId)
    .in('order_id', orderIds)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Creator queries
export const getCreatorEvents = async (creatorId: string) => {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('creator_id', creatorId)
    .gte('date', now) // Only get upcoming/active events
    .order('date', { ascending: true }) // Order by date ascending (soonest first)

  if (error) throw error
  return data
}

export const getCreatorPastEvents = async (creatorId: string) => {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('creator_id', creatorId)
    .lt('date', now) // Only get past events
    .order('date', { ascending: false }) // Order by date descending (most recent first)

  if (error) throw error
  return data
}

export const getCreatorDeletedEvents = async (creatorId: string) => {
  const { data, error } = await supabase
    .from('deleted_events')
    .select('*')
    .eq('creator_id', creatorId)
    .order('deleted_at', { ascending: false })

  if (error) throw error
  return data
}

export const getCreatorProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle() // Use maybeSingle() instead of single() to return null if no rows

  if (error) throw error
  return data || null
}

// Event analytics queries
export const getEventAnalytics = async (eventId: string) => {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*, tickets(*)')
    .eq('event_id', eventId)
    .eq('payment_status', 'paid')

  if (ordersError) throw ordersError

  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('*, ticket_type:ticket_types(*)')
    .eq('event_id', eventId)

  if (ticketsError) throw ticketsError

  return {
    orders: orders || [],
    tickets: tickets || [],
  }
}

// Wallet queries
export const getWalletTransactions = async (creatorId: string) => {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Withdrawal queries
export const getCreatorWithdrawals = async (creatorId: string) => {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const getAllWithdrawals = async () => {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*, creator:users!withdrawals_creator_id_fkey(id, email, full_name, school)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const getCreatorBalance = async (creatorId: string) => {
  const { data, error } = await supabase
    .from('creator_profiles')
    .select('account_balance, bank_account_name, bank_account_number, bank_name, bank_code, is_bank_verified')
    .eq('user_id', creatorId)
    .single()

  if (error) throw error
  return data
}

// Admin queries
export const getAllEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_types(*), creator:users!events_creator_id_fkey(id, email, full_name, school)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const getAllOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, event:events(id, title, creator:users!events_creator_id_fkey(id, email, full_name)), user:users(id, email, full_name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const getAllTickets = async () => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, event:events(id, title), ticket_type:ticket_types(id, name, price, is_free), user:users(id, email, full_name), order:orders(id, payment_status)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all tickets:', error)
    throw error
  }
  return data || []
}

export const getAllOrganizers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*, creator_profile:creator_profiles(*)')
    .eq('role', 'creator')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const getRevenueByEvent = async () => {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('event_id, total_amount, payment_status, event:events(id, title)')
    .eq('payment_status', 'paid')

  if (error) throw error

  // Group by event_id and calculate total revenue
  const revenueMap = new Map<string, { eventId: string; eventTitle: string; revenue: number }>()
  
  orders?.forEach((order: any) => {
    const eventId = order.event_id
    const eventTitle = order.event?.title || 'Unknown Event'
    const current = revenueMap.get(eventId) || { eventId, eventTitle, revenue: 0 }
    current.revenue += parseFloat(order.total_amount || 0)
    revenueMap.set(eventId, current)
  })

  return Array.from(revenueMap.values()).sort((a, b) => b.revenue - a.revenue)
}

export const getAdminStats = async () => {
  // Get all events count by status
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('status')

  if (eventsError) throw eventsError

  const eventsByStatus = {
    active: 0,
    draft: 0,
    completed: 0,
    cancelled: 0,
  }

  events?.forEach((event: any) => {
    if (event.status in eventsByStatus) {
      eventsByStatus[event.status as keyof typeof eventsByStatus]++
    }
  })

  // Get all users count by role
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('role, banned')

  if (usersError) throw usersError

  const usersByRole = {
    user: 0,
    creator: 0,
    admin: 0,
  }
  let bannedUsers = 0

  users?.forEach((user: any) => {
    if (user.role in usersByRole) {
      usersByRole[user.role as keyof typeof usersByRole]++
    }
    if (user.banned) bannedUsers++
  })

  // Get total revenue (all paid orders)
  const { data: paidOrders, error: ordersError } = await supabase
    .from('orders')
    .select('total_amount, created_at')
    .eq('payment_status', 'paid')

  if (ordersError) throw ordersError

  const totalRevenue = paidOrders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0

  // Get this month's revenue
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thisMonthRevenue = paidOrders?.filter(order => order.created_at >= startOfMonth)
    .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0

  // Get total tickets sold
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id')

  if (ticketsError) throw ticketsError

  const totalTicketsSold = tickets?.length || 0

  // Get active organizers count
  const { data: organizers, error: organizersError } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'creator')

  if (organizersError) throw organizersError

  const activeOrganizers = organizers?.length || 0

  return {
    events: {
      total: events?.length || 0,
      byStatus: eventsByStatus,
    },
    users: {
      total: users?.length || 0,
      byRole: usersByRole,
      banned: bannedUsers,
    },
    revenue: {
      total: totalRevenue,
      thisMonth: thisMonthRevenue,
    },
    tickets: {
      totalSold: totalTicketsSold,
    },
    organizers: {
      active: activeOrganizers,
    },
  }
}

