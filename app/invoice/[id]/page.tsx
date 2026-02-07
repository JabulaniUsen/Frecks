'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getOrderById } from '@/lib/supabase/queries'
import { Calendar, MapPin, Download, Check, ArrowLeft, Loader2, Ticket, Copy } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import Header from '@/components/Header'
import { toast } from 'sonner'

const SERVICE_CHARGE = 200

export default function InvoicePage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
  })

  // Check if this is the first time viewing this invoice (only show success message once)
  useEffect(() => {
    if (order && order.payment_status === 'paid') {
      const storageKey = `invoice_viewed_${orderId}`
      const hasViewed = localStorage.getItem(storageKey)
      
      if (!hasViewed) {
        // First time viewing - show success message
        setShowSuccessMessage(true)
        // Mark as viewed
        localStorage.setItem(storageKey, 'true')
        
        // Hide success message after 3 seconds
        const timer = setTimeout(() => {
          setShowSuccessMessage(false)
        }, 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [order, orderId])

  const handleCopyInvoice = () => {
    const invoiceUrl = window.location.href
    navigator.clipboard.writeText(invoiceUrl).then(() => {
      toast.success('Invoice URL copied to clipboard!')
    }).catch(() => {
      toast.error('Failed to copy URL')
    })
  }

  const handleDownloadTicket = async (ticketId: string, ticketTypeName: string) => {
    try {
      // Get ticket with QR code
      const ticket = order?.tickets?.find((t: any) => t.id === ticketId)
      // Use storage URL if available, otherwise fall back to data URL
      const qrImage = ticket?.qr_code_data?.qrCodeImageUrl || ticket?.qr_code_data?.qrCodeImage
      if (!ticket || !qrImage) {
        toast.error('QR code not available')
        return
      }

      // Create a new window to print/download
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error('Please allow popups to download ticket')
        return
      }
      const event = order?.event

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket - ${event?.title}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
              }
              .ticket {
                border: 2px solid #000;
                border-radius: 8px;
                padding: 30px;
                text-align: center;
              }
              .ticket-header {
                margin-bottom: 20px;
              }
              .ticket-title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
              }
              .qr-code {
                margin: 20px 0;
              }
              .qr-code img {
                max-width: 300px;
                height: auto;
              }
              .ticket-info {
                margin-top: 20px;
                text-align: left;
              }
              .ticket-info p {
                margin: 5px 0;
              }
            </style>
          </head>
          <body>
            <div class="ticket">
              <div class="ticket-header">
                <h1 class="ticket-title">${event?.title || 'Event Ticket'}</h1>
                <p><strong>Ticket Type:</strong> ${ticketTypeName}</p>
              </div>
              <div class="qr-code">
                <img src="${qrImage}" alt="QR Code" />
              </div>
              <div class="ticket-info">
                <p><strong>Order ID:</strong> ${order?.id}</p>
                <p><strong>Ticket ID:</strong> ${ticketId}</p>
                <p><strong>Date:</strong> ${event?.date ? format(new Date(event.date), 'MMM d, yyyy • h:mm a') : 'N/A'}</p>
                <p><strong>Location:</strong> ${event?.location || 'N/A'}</p>
                <p><strong>Name:</strong> ${order?.full_name}</p>
                <p><strong>Email:</strong> ${order?.email}</p>
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    } catch (error: any) {
      console.error('Error downloading ticket:', error)
      toast.error('Failed to download ticket')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Order not found</h1>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const event = order.event
  const tickets = order.tickets || []
  const ticketAmount = order.total_amount - SERVICE_CHARGE

  // Only show tickets if order is paid
  if (order.payment_status !== 'paid') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto bg-card rounded-2xl border border-border p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-yellow-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Payment Pending</h1>
              <p className="text-muted-foreground mb-6">
                Your order is being processed. Please wait for payment confirmation.
              </p>
              <Badge className="mb-4" variant="outline">
                Order Status: {order.payment_status}
              </Badge>
              <div className="mt-6">
                <Link href="/">
                  <Button variant="outline">Back to Home</Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyInvoice}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Invoice
                </Button>
                <Badge className="bg-green-500 text-white">
                  <Check className="w-3 h-3 mr-1" />
                  Paid
                </Badge>
              </div>
            </div>

            {/* Success Message */}
            {showSuccessMessage && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="lg:text-xl font-bold text-green-600 mb-1">Payment Successful!</h2>
                    <p className="text-muted-foreground text-sm lg:text-base">
                      Your tickets have been confirmed. Show these QR codes at the event.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tickets with QR Codes */}
            <div className="bg-card rounded-2xl border border-border p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Your Tickets ({tickets.length})</h2>
              <div className="space-y-6">
                {tickets.map((ticket: any, index: number) => {
                  const ticketType = ticket.ticket_type
                  // Use storage URL if available, otherwise fall back to data URL
                  const qrCodeImage = ticket.qr_code_data?.qrCodeImageUrl || ticket.qr_code_data?.qrCodeImage

                  return (
                    <div key={ticket.id} className="border border-border rounded-xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Ticket className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-semibold">
                              {ticketType?.name || 'Ticket'} #{index + 1}
                            </h3>
                          </div>
                          {ticketType?.description && (
                            <p className="text-sm text-muted-foreground">{ticketType.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2 font-mono">
                            Ticket ID: {ticket.id.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {ticketType?.is_free ? 'Free' : `₦${ticketType?.price || 0}`}
                          </p>
                        </div>
                      </div>

                      {qrCodeImage ? (
                        <div className="flex flex-col items-center gap-4">
                          <div className="bg-white p-4 rounded-lg border-2 border-border">
                            <img
                              src={qrCodeImage}
                              alt="QR Code"
                              className="w-48 h-48"
                            />
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleDownloadTicket(ticket.id, ticketType?.name || 'Ticket')}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Ticket
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          QR code not available
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-card rounded-2xl border border-border p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Ticket Details</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* <div>
                  <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                  <p className="font-mono font-semibold">{order.id}</p>
                </div> */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Date</p>
                  <p className="font-semibold">{format(new Date(order.created_at), 'MMM d, yyyy • h:mm a')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Name</p>
                  <p className="font-semibold">{order.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="font-semibold">{order.email}</p>
                </div>
              </div>
            </div>

            {/* Event Details */}
            {event && (
              <div className="bg-card rounded-2xl border border-border p-6 mb-6">
                <h2 className="text-2xl font-bold mb-4">Event Information</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
                    <Badge className="mb-3">{event.category}</Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date & Time</p>
                        <p className="font-semibold">{format(new Date(event.date), 'MMM d, yyyy • h:mm a')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-semibold">{event.location}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div className="bg-card rounded-2xl border border-border p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Payment Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₦{ticketAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Charge</span>
                  <span className="font-medium">₦{SERVICE_CHARGE.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-semibold">Total Paid</span>
                  <span className="text-2xl font-bold text-primary">₦{order.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full text-xs">
                  Browse More Events
                </Button>
              </Link>
              <Button
                variant="hero"
                onClick={() => {
                  // Download all tickets one by one
                  tickets.forEach((ticket: any, index: number) => {
                    const ticketType = ticket.ticket_type
                    const qrImage = ticket.qr_code_data?.qrCodeImageUrl || ticket.qr_code_data?.qrCodeImage
                    if (qrImage) {
                      setTimeout(() => {
                        handleDownloadTicket(ticket.id, ticketType?.name || 'Ticket')
                      }, 1000 * index)
                    }
                  })
                  toast.success('Opening all tickets for download...')
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="text-xs">Download All Tickets</span>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

