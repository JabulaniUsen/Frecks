// Paystack configuration and helper functions

export const PAYSTACK_PUBLIC_KEY = 
  (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY : undefined) ||
  ''

if (!PAYSTACK_PUBLIC_KEY) {
  console.warn('Paystack public key is not set. Payment functionality will not work.')
}

export interface PaystackConfig {
  key: string
  email: string
  amount: number
  ref: string
  currency?: string
  metadata?: Record<string, any>
  callback?: (response: any) => void
  onClose?: () => void
}

// Config for openPaystackPopup - key is optional since it's added internally
export interface OpenPaystackPopupConfig {
  email: string
  amount: number
  ref: string
  currency?: string
  metadata?: Record<string, any>
  callback?: (response: any) => void
  onClose?: () => void
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => {
        openIframe: () => void
      }
    }
  }
}

export const initializePaystack = () => {
  if (typeof window !== 'undefined' && !window.PaystackPop && PAYSTACK_PUBLIC_KEY) {
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    document.head.appendChild(script)
    return new Promise<void>((resolve) => {
      script.onload = () => resolve()
    })
  }
  return Promise.resolve()
}

export const openPaystackPopup = (config: OpenPaystackPopupConfig) => {
  if (!window.PaystackPop) {
    console.error('Paystack not loaded')
    return
  }

  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: config.email,
    amount: config.amount * 100, // Convert to kobo (smallest currency unit)
    ref: config.ref,
    currency: config.currency || 'NGN',
    metadata: config.metadata,
    callback: (response: any) => {
      if (config.callback) {
        config.callback(response)
      }
    },
    onClose: () => {
      if (config.onClose) {
        config.onClose()
      }
    },
  })

  handler.openIframe()
}

// Bank interface
export interface Bank {
  name: string
  code: string
  slug: string
  longcode?: string
  gateway?: string
  pay_with_bank?: boolean
  active?: boolean
  is_deleted?: boolean
  country?: string
  currency?: string
  type?: string
}

// Verify bank account using Paystack
export interface VerifyBankAccountParams {
  account_number: string
  bank_code: string
}

export interface VerifyBankAccountResponse {
  verified: boolean
  account_name?: string
  account_number?: string
  bank_id?: number
  error?: string
}

// Get list of banks from Paystack (uses Next.js API route first, fallback to edge function)
export const getBanks = async (): Promise<Bank[]> => {
  try {
    // Try Next.js API route first (no CORS issues, works immediately)
    try {
      const response = await fetch('/api/get-banks', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      const banks = data.banks || []
      console.log('Banks from API route:', banks.length, 'banks')
      
      if (banks.length === 0) {
        console.warn('Empty banks array returned')
      }
      
      return banks
    } catch (apiError: any) {
      // If API route fails, try edge function as fallback
      console.warn('API route failed, trying edge function:', apiError.message)
      
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      const { data, error } = await supabase.functions.invoke('get-paystack-banks', {
        headers: {
          Authorization: session ? `Bearer ${session.access_token}` : '',
        },
      })

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error('No response from bank service')
      }

      if (data.error) {
        throw new Error(data.error)
      }

      const banks = data.banks || []
      return banks
    }
  } catch (error: any) {
    console.error('Error fetching banks:', error)
    
    // Provide helpful error message
    const errorMessage = error.message || JSON.stringify(error)
    if (
      errorMessage.includes('not found') || 
      errorMessage.includes('404') || 
      errorMessage.includes('Function not found') ||
      errorMessage.includes('Failed to send') ||
      errorMessage.includes('CORS')
    ) {
      throw new Error(
        'Bank service is not available. Please check your environment variables (PAYSTACK_SECRET_KEY) and try again.'
      )
    }
    
    throw new Error(error.message || 'Failed to fetch banks. Please try again.')
  }
}

export const verifyBankAccount = async (
  params: VerifyBankAccountParams
): Promise<VerifyBankAccountResponse> => {
  try {
    // Validate input
    if (!params.account_number || !params.bank_code) {
      return {
        verified: false,
        error: 'Account number and bank code are required',
      }
    }

    if (params.account_number.length !== 10) {
      return {
        verified: false,
        error: 'Account number must be exactly 10 digits',
      }
    }

    // Try Next.js API route first (no CORS issues, works immediately)
    try {
      const response = await fetch('/api/verify-bank-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        return {
          verified: false,
          error: data.error,
        }
      }

      return {
        verified: data.verified || false,
        account_name: data.account_name,
        account_number: data.account_number,
        bank_id: data.bank_id,
      }
    } catch (apiError: any) {
      // If API route fails, try edge function as fallback
      console.warn('API route failed, trying edge function:', apiError.message)
      
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      const { data, error } = await supabase.functions.invoke('verify-bank-account', {
        body: params,
        headers: {
          Authorization: session ? `Bearer ${session.access_token}` : '',
        },
      })

      if (error) {
        throw error
      }

      if (!data) {
        return {
          verified: false,
          error: 'No response from verification service',
        }
      }

      if (data.error) {
        return {
          verified: false,
          error: data.error,
        }
      }

      return {
        verified: data.verified || false,
        account_name: data.account_name,
        account_number: data.account_number,
        bank_id: data.bank_id,
      }
    }
  } catch (error: any) {
    console.error('Bank verification error:', error)
    
    // Provide helpful error message
    const errorMessage = error.message || JSON.stringify(error)
    if (
      errorMessage.includes('not found') || 
      errorMessage.includes('404') || 
      errorMessage.includes('Function not found') ||
      errorMessage.includes('Failed to send') ||
      errorMessage.includes('CORS')
    ) {
      return {
        verified: false,
        error: 'Bank verification service is not available. Please check your environment variables (PAYSTACK_SECRET_KEY) and try again.',
      }
    }
    
    return {
      verified: false,
      error: error.message || 'Failed to verify bank account. Please try again.',
    }
  }
}

// Verify payment using Next.js API route (fallback to edge function if needed)
export const verifyPayment = async (
  orderId: string,
  paystackReference: string
): Promise<{ verified: boolean; orderId?: string; paymentStatus?: string; error?: string }> => {
  try {
    // Try Next.js API route first (no CORS issues, works immediately)
    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, paystackReference }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (apiError: any) {
      // If API route fails, try edge function as fallback
      console.warn('API route failed, trying edge function:', apiError.message)
      
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { orderId, paystackReference },
        headers: {
          Authorization: session ? `Bearer ${session.access_token}` : '',
          'Content-Type': 'application/json',
        },
      })

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error('No response from verification service')
      }

      return data
    }
  } catch (error: any) {
    console.error('Payment verification error:', error)
    
    // Provide helpful error message
    const errorMessage = error.message || JSON.stringify(error)
    if (
      errorMessage.includes('not found') || 
      errorMessage.includes('404') || 
      errorMessage.includes('Function not found') ||
      errorMessage.includes('Failed to send') ||
      errorMessage.includes('CORS')
    ) {
      return {
        verified: false,
        error: 'Payment verification service error. Please check your environment variables (PAYSTACK_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY) and try again.',
      }
    }
    
    return {
      verified: false,
      error: error.message || 'Failed to verify payment. Please try again.',
    }
  }
}

