import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { verified: false, error: 'Paystack secret key not configured' },
        { status: 500 }
      )
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { verified: false, error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { orderId, paystackReference } = body

    if (!orderId || !paystackReference) {
      return NextResponse.json(
        { verified: false, error: 'Order ID and Paystack reference are required' },
        { status: 400 }
      )
    }

    // Verify payment with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${paystackReference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const paystackData = await response.json()

    if (!paystackData.status || !paystackData.data) {
      return NextResponse.json(
        {
          verified: false,
          error: paystackData.message || 'Payment verification failed',
        },
        { status: 400 }
      )
    }

    const transaction = paystackData.data

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if payment was successful
    if (transaction.status !== 'success' || transaction.gateway_response !== 'Successful') {
      // Update order to failed status
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      return NextResponse.json(
        {
          verified: false,
          error: 'Payment was not successful',
          status: transaction.status,
        },
        { status: 400 }
      )
    }

    // Payment is successful, update order status to paid
    // Get order first to check current status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        {
          verified: false,
          error: 'Order not found',
        },
        { status: 404 }
      )
    }

    // Only update if order is still pending
    if (order.payment_status === 'pending') {
      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          paystack_reference: paystackReference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (updateError) {
        console.error('Error updating order:', updateError)
        return NextResponse.json(
          {
            verified: false,
            error: 'Failed to update order status',
          },
          { status: 500 }
        )
      }

      // Update ticket type sold_count
      const { data: tickets } = await supabase
        .from('tickets')
        .select('ticket_type_id')
        .eq('order_id', orderId)

      if (tickets && tickets.length > 0) {
        const ticketTypeCounts = new Map<string, number>()
        for (const ticket of tickets) {
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
              .update({ sold_count: (ticketType.sold_count || 0) + count })
              .eq('id', ticketTypeId)
          }
        }
      }

      // Send ticket email (don't wait for it, fire and forget)
      try {
        const { data: eventData } = await supabase
          .from('events')
          .select('title, date, location')
          .eq('id', order.event_id)
          .single()

        if (eventData && order.email) {
          const ticketCount = tickets?.length || 0
          const eventDate = new Date(eventData.date).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })

          // Send email asynchronously
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'ticket',
              userName: order.full_name,
              email: order.email,
              eventTitle: eventData.title,
              eventDate,
              eventLocation: eventData.location,
              ticketCount,
              totalAmount: parseFloat(order.total_amount.toString()),
              orderId: order.id,
            }),
          }).catch((error) => {
            console.error('Failed to send ticket email:', error)
          })
        }
      } catch (emailError) {
        console.error('Error preparing ticket email:', emailError)
        // Don't fail payment verification if email fails
      }
    }

    return NextResponse.json({
      verified: true,
      orderId: orderId,
      paymentStatus: 'paid',
    })
  } catch (error: any) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      {
        verified: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

