import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
// These are automatically available in Supabase Edge Functions (set via secrets)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface VerifyRequest {
  orderId: string
  paystackReference: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack secret key not configured')
    }

    const { orderId, paystackReference }: VerifyRequest = await req.json()

    if (!orderId || !paystackReference) {
      return new Response(
        JSON.stringify({ error: 'Order ID and Paystack reference are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
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
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: paystackData.message || 'Payment verification failed'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const transaction = paystackData.data

    // Check if Supabase config is available
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase configuration:', { 
        hasUrl: !!SUPABASE_URL, 
        hasKey: !!SUPABASE_SERVICE_ROLE_KEY 
      })
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: 'Server configuration error. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check if payment was successful
    if (transaction.status !== 'success' || transaction.gateway_response !== 'Successful') {
      // Update order to failed status
      await supabase
        .from('orders')
        .update({ 
          payment_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      return new Response(
        JSON.stringify({ 
          verified: false,
          error: 'Payment was not successful',
          status: transaction.status
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
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
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: 'Order not found'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
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
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (updateError) {
        throw updateError
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
    }

    return new Response(
      JSON.stringify({
        verified: true,
        orderId: orderId,
        paymentStatus: 'paid',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        verified: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

