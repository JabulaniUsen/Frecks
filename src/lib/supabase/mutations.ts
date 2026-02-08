import { supabase } from '../supabase'

// Event mutations
export const createEvent = async (eventData: {
  creator_id: string
  title: string
  description?: string
  category: string
  image_url?: string
  date: string
  location: string
  is_featured?: boolean
  ticket_types: Array<{
    name: string
    description?: string
    price: number
    quantity: number
    is_free?: boolean
  }>
}) => {
  console.log('Creating event in database...', {
    creator_id: eventData.creator_id,
    title: eventData.title,
    category: eventData.category
  })

  // Create event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      creator_id: eventData.creator_id,
      title: eventData.title,
      description: eventData.description,
      category: eventData.category,
      image_url: eventData.image_url,
      date: eventData.date,
      location: eventData.location,
      is_featured: eventData.is_featured || false,
      status: 'active',
    })
    .select()
    .single()

  if (eventError) {
    console.error('Event creation error:', eventError)
    throw new Error(`Failed to create event: ${eventError.message} (${eventError.code || 'unknown'})`)
  }

  if (!event) {
    throw new Error('Event creation returned no data')
  }

  console.log('Event created, ID:', event.id)
  console.log('Creating ticket types...', eventData.ticket_types.length)

  // Create ticket types
  const ticketTypesData = eventData.ticket_types.map((tt) => ({
    event_id: event.id,
    name: tt.name,
    description: tt.description,
    price: tt.price,
    quantity: tt.quantity,
    is_free: tt.is_free || false,
  }))

  const { error: ticketTypesError } = await supabase
    .from('ticket_types')
    .insert(ticketTypesData)

  if (ticketTypesError) {
    console.error('Ticket types creation error:', ticketTypesError)
    throw new Error(`Failed to create ticket types: ${ticketTypesError.message} (${ticketTypesError.code || 'unknown'})`)
  }

  console.log('Ticket types created successfully')
  return event
}

export const updateEvent = async (eventId: string, eventData: {
  title: string
  description?: string
  category: string
  image_url?: string
  date: string
  location: string
  is_featured?: boolean
  ticket_types: Array<{
    id?: string
    name: string
    description?: string
    price: number
    quantity: number
    is_free?: boolean
  }>
}) => {
  // Update event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .update({
      title: eventData.title,
      description: eventData.description,
      category: eventData.category,
      image_url: eventData.image_url,
      date: eventData.date,
      location: eventData.location,
      is_featured: eventData.is_featured || false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .select()
    .single()

  if (eventError) {
    throw new Error(`Failed to update event: ${eventError.message}`)
  }

  if (!event) {
    throw new Error('Event update returned no data')
  }

  // Get existing ticket types
  const { data: existingTicketTypes } = await supabase
    .from('ticket_types')
    .select('id')
    .eq('event_id', eventId)

  const existingIds = new Set(existingTicketTypes?.map(tt => tt.id) || [])
  const newTicketTypeIds = new Set(eventData.ticket_types.filter(tt => tt.id).map(tt => tt.id!))

  // Delete ticket types that are no longer in the update
  const toDelete = Array.from(existingIds).filter(id => !newTicketTypeIds.has(id))
  if (toDelete.length > 0) {
    await supabase
      .from('ticket_types')
      .delete()
      .in('id', toDelete)
  }

  // Update or insert ticket types
  for (const tt of eventData.ticket_types) {
    if (tt.id && existingIds.has(tt.id)) {
      // Update existing
      await supabase
        .from('ticket_types')
        .update({
          name: tt.name,
          description: tt.description,
          price: tt.price,
          quantity: tt.quantity,
          is_free: tt.is_free || false,
        })
        .eq('id', tt.id)
    } else {
      // Insert new
      await supabase
        .from('ticket_types')
        .insert({
          event_id: eventId,
          name: tt.name,
          description: tt.description,
          price: tt.price,
          quantity: tt.quantity,
          is_free: tt.is_free || false,
        })
    }
  }

  return event
}

export const deleteEvent = async (eventId: string, userId: string) => {
  // Get the event first
  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('creator_id', userId)
    .single()

  if (fetchError) throw fetchError
  if (!event) throw new Error('Event not found or access denied')

  // Insert into deleted_events table
  const { error: deleteError } = await supabase
    .from('deleted_events')
    .insert({
      original_event_id: event.id,
      creator_id: event.creator_id,
      title: event.title,
      description: event.description,
      category: event.category,
      image_url: event.image_url,
      date: event.date,
      location: event.location,
      is_featured: event.is_featured,
      status: 'cancelled',
      deleted_by: userId,
      created_at: event.created_at,
      updated_at: event.updated_at,
    })

  if (deleteError) throw deleteError

  // Delete the event from events table (cascade will handle related records)
  const { error: removeError } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('creator_id', userId)

  if (removeError) throw removeError

  return { success: true }
}

// Order mutations
export const createOrder = async (orderData: {
  user_id?: string
  event_id: string
  email: string
  full_name: string
  total_amount: number
  paystack_reference: string
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
  tickets: Array<{
    ticket_type_id: string
    qr_code: string
    qr_code_data: any
  }>
}) => {
  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: orderData.user_id,
      event_id: orderData.event_id,
      email: orderData.email,
      full_name: orderData.full_name,
      total_amount: orderData.total_amount,
      paystack_reference: orderData.paystack_reference,
      payment_status: orderData.payment_status || 'pending',
    })
    .select()
    .single()

  if (orderError) throw orderError

  // Create tickets (only mark as valid if payment is paid)
  const ticketsData = orderData.tickets.map((ticket) => ({
    ticket_type_id: ticket.ticket_type_id,
    event_id: orderData.event_id,
    user_id: orderData.user_id,
    order_id: order.id,
    qr_code: ticket.qr_code,
    qr_code_data: ticket.qr_code_data,
    status: orderData.payment_status === 'paid' ? 'valid' : 'valid', // Tickets created are valid but order is pending
  }))

  const { error: ticketsError } = await supabase.from('tickets').insert(ticketsData)

  if (ticketsError) throw ticketsError

  // Only update sold_count if payment is paid
  if (orderData.payment_status === 'paid') {
    const ticketTypeCounts = new Map<string, number>()
    for (const ticket of orderData.tickets) {
      const count = ticketTypeCounts.get(ticket.ticket_type_id) || 0
      ticketTypeCounts.set(ticket.ticket_type_id, count + 1)
    }

    for (const [ticketTypeId, count] of ticketTypeCounts) {
      const { data: ticketType } = await supabase
        .from('ticket_types')
        .select('sold_count')
        .eq('id', ticketTypeId)
        .single()

      if (ticketType) {
        await supabase
          .from('ticket_types')
          .update({ sold_count: ticketType.sold_count + count })
          .eq('id', ticketTypeId)
      }
    }
  }

  return order
}

export const updateOrderPaymentStatus = async (orderId: string, paystackReference: string, paymentStatus: 'paid' | 'failed') => {
  // Update order status
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .update({
      payment_status: paymentStatus,
      paystack_reference: paystackReference,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single()

  if (orderError) throw orderError

  if (!order) {
    throw new Error('Order not found')
  }

  // If payment is successful, update ticket type sold_count
  if (paymentStatus === 'paid') {
    // Get all tickets for this order
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('ticket_type_id')
      .eq('order_id', orderId)

    if (ticketsError) throw ticketsError

    if (tickets && tickets.length > 0) {
      // Count tickets by type
      const ticketTypeCounts = new Map<string, number>()
      for (const ticket of tickets) {
        const count = ticketTypeCounts.get(ticket.ticket_type_id) || 0
        ticketTypeCounts.set(ticket.ticket_type_id, count + 1)
      }

      // Update sold_count for each ticket type
      for (const [ticketTypeId, count] of ticketTypeCounts) {
        const { data: ticketType } = await supabase
          .from('ticket_types')
          .select('sold_count')
          .eq('id', ticketTypeId)
          .single()

        if (ticketType) {
          await supabase
            .from('ticket_types')
            .update({ sold_count: (ticketType.sold_count || 0) + count })
            .eq('id', ticketTypeId)
        }
      }
    }
  }

  return order
}

// Creator profile mutations
export const updateCreatorBankAccount = async (
  userId: string,
  bankData: {
    bank_account_name: string
    bank_account_number: string
    bank_name: string
    bank_code: string
    is_bank_verified?: boolean
    paystack_recipient_code?: string
  }
) => {
  const { data, error } = await supabase
    .from('creator_profiles')
    .upsert({
      user_id: userId,
      ...bankData,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Ticket validation mutations
// Validate ticket - checks that validator is event creator
export const validateTicket = async (ticketId: string, validatedBy: string) => {
  // Check if ticket exists and get event info
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('*, event:events!inner(creator_id, id)')
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket) {
    throw new Error('Ticket not found')
  }

  // Verify that the validator is the event creator
  if (ticket.event?.creator_id !== validatedBy) {
    throw new Error('Only the event creator can validate tickets')
  }

  // Check if ticket is already used
  if (ticket.status === 'used') {
    throw new Error('Ticket has already been validated')
  }

  // Check if ticket is cancelled
  if (ticket.status === 'cancelled') {
    throw new Error('Ticket has been cancelled')
  }

  // Update ticket status to used
  const { error: updateError } = await supabase
    .from('tickets')
    .update({
      status: 'used',
      checked_in_at: new Date().toISOString(),
      checked_in_by: validatedBy,
    })
    .eq('id', ticketId)

  if (updateError) {
    throw new Error(`Failed to validate ticket: ${updateError.message}`)
  }

  // Log validation
  await supabase.from('qr_scans').insert({
    ticket_id: ticketId,
    scanned_by: validatedBy,
    scan_result: 'valid',
  })

  return { success: true, ticketId }
}

// User profile mutations
export const updateUserProfile = async (userId: string, profileData: {
  full_name?: string
  gender?: string | null
  school?: string | null
  avatar_name?: string | null
}) => {
  const { data, error } = await supabase
    .from('users')
    .update({
      full_name: profileData.full_name,
      gender: profileData.gender,
      school: profileData.school,
      avatar_name: profileData.avatar_name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Admin mutations
export const adminDeleteEvent = async (eventId: string) => {
  // Get the event first
  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (fetchError) throw fetchError
  if (!event) throw new Error('Event not found')

  // Insert into deleted_events table
  const { error: deleteError } = await supabase
    .from('deleted_events')
    .insert({
      original_event_id: event.id,
      creator_id: event.creator_id,
      title: event.title,
      description: event.description,
      category: event.category,
      image_url: event.image_url,
      date: event.date,
      location: event.location,
      is_featured: event.is_featured,
      status: 'cancelled',
      deleted_by: event.creator_id, // Admin deleted
      created_at: event.created_at,
      updated_at: event.updated_at,
    })

  if (deleteError) throw deleteError

  // Hard delete the event (admin bypasses creator check)
  const { error: removeError } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (removeError) throw removeError

  return { success: true }
}

export const adminUpdateUserRole = async (userId: string, role: 'user' | 'creator' | 'admin') => {
  const { data, error } = await supabase
    .from('users')
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error

  // If role is creator, ensure creator profile exists
  if (role === 'creator') {
    const { data: existingProfile } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!existingProfile) {
      await supabase
        .from('creator_profiles')
        .insert({ user_id: userId })
    }
  }

  return data
}

export const adminBanUser = async (userId: string, banned: boolean) => {
  const { data, error } = await supabase
    .from('users')
    .update({
      banned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const adminUpdateEventStatus = async (eventId: string, status: 'draft' | 'active' | 'completed' | 'cancelled') => {
  const { data, error } = await supabase
    .from('events')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error
  return data
}

