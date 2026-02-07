import { NextRequest, NextResponse } from 'next/server'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function POST(request: NextRequest) {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { verified: false, error: 'Paystack secret key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { account_number, bank_code } = body

    if (!account_number || !bank_code) {
      return NextResponse.json(
        { verified: false, error: 'Account number and bank code are required' },
        { status: 400 }
      )
    }

    if (account_number.length !== 10) {
      return NextResponse.json(
        { verified: false, error: 'Account number must be exactly 10 digits' },
        { status: 400 }
      )
    }

    // Build URL with query parameters
    const url = new URL('https://api.paystack.co/bank/resolve')
    url.searchParams.append('account_number', account_number)
    url.searchParams.append('bank_code', bank_code)

    // Call Paystack bank account verification API
    const verifyResponse = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await verifyResponse.json()

    if (!data.status || !data.data) {
      return NextResponse.json(
        {
          verified: false,
          error: data.message || 'Failed to verify bank account',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      verified: true,
      account_name: data.data.account_name,
      account_number: data.data.account_number,
      bank_id: data.data.bank_id,
    })
  } catch (error: any) {
    console.error('Bank verification error:', error)
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

