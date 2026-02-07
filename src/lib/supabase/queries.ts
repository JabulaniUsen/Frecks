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
}) => {
  const now = new Date().toISOString()
  let query = supabase
    .from('events')
    .select('*, ticket_types(*)')
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
  return data
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

