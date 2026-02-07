import { NextRequest, NextResponse } from 'next/server'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function GET(request: NextRequest) {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Paystack secret key not configured', banks: [] },
        { status: 500 }
      )
    }

    // Call Paystack banks API
    const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!data.status) {
      return NextResponse.json(
        { 
          error: data.message || 'Failed to fetch banks',
          banks: [] 
        },
        { status: 400 }
      )
    }

    // Filter only active banks
    const activeBanks = (data.data || []).filter((bank: any) => bank.active !== false)

    return NextResponse.json({
      banks: activeBanks,
    })
  } catch (error: any) {
    console.error('Error fetching banks:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        banks: [] 
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

