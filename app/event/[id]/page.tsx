'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Users, Clock, ArrowLeft, Minus, Plus, ShieldCheck, Loader2 } from "lucide-react";
import { getEventById } from "@/lib/supabase/queries";
import { createOrder } from "@/lib/supabase/mutations";
import { initializePaystack, openPaystackPopup, verifyPayment } from "@/lib/paystack";
import { generateQRCodeDataURL, generateAndUploadQRCode, type QRCodeData } from "@/lib/qrcode";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useParams } from "next/navigation";
import { toast } from "sonner";

const SERVICE_CHARGE = 200;

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { user, profile } = useAuth();
  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEventById(eventId),
    enabled: !!eventId,
  });
  
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [step, setStep] = useState<"select" | "checkout" | "processing">("select");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paystackInitialized, setPaystackInitialized] = useState(false);

  const ticketTypes = event?.ticket_types || [];
  
  // Calculate values before mutations (use eventId directly for calculations)
  const ticketAmount = Object.entries(selectedTickets).reduce((sum, [ticketId, count]) => {
    const ticket = ticketTypes.find((t: any) => t.id === ticketId);
    return sum + (ticket?.price || 0) * count;
  }, 0);

  const totalAmount = ticketAmount + SERVICE_CHARGE;
  const attendees = ticketTypes.reduce((sum: number, tt: any) => sum + (tt.sold_count || 0), 0);
  const totalTickets = Object.values(selectedTickets).reduce((sum, count) => sum + count, 0);

  // Initialize Paystack on mount
  useEffect(() => {
    initializePaystack().then(() => {
      setPaystackInitialized(true);
    });
  }, []);

  // Auto-fill user details when entering checkout if signed in
  useEffect(() => {
    if (step === "checkout" && profile) {
      if (profile.full_name && !fullName.trim()) {
        setFullName(profile.full_name);
      }
      if (profile.email && !email.trim()) {
        setEmail(profile.email);
      }
    }
  }, [step, profile]);

  // All hooks must be called before any early returns
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!fullName.trim() || !email.trim()) {
        throw new Error('Please fill in your name and email');
      }

      if (totalTickets === 0) {
        throw new Error('Please select at least one ticket');
      }

      // Generate unique reference
      const paystackReference = `frecks_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Generate QR codes for each ticket
      const ticketsWithQR: Array<{
        ticket_type_id: string
        qr_code: string
        qr_code_data: QRCodeData
      }> = [];

      for (const [ticketTypeId, count] of Object.entries(selectedTickets)) {
        for (let i = 0; i < count; i++) {
          // Generate temporary ticket ID (will be replaced with actual ticket ID after creation)
          const tempTicketId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          
          const qrCodeData: QRCodeData = {
            ticketId: tempTicketId,
            orderId: '', // Will be set after order creation
            eventId: eventId,
            timestamp: Date.now(),
          };

          // Generate QR code as data URL (temporary - will be replaced with storage URL after ticket creation)
          const qrCodeDataURL = await generateQRCodeDataURL(qrCodeData);
          
          // Create unique QR code string identifier
          const qrCodeString = `${eventId}_${ticketTypeId}_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`;

          ticketsWithQR.push({
            ticket_type_id: ticketTypeId,
            qr_code: qrCodeString,
            qr_code_data: {
              ...qrCodeData,
              qrCodeImage: qrCodeDataURL,
            },
          });
        }
      }

      // Create order with pending status
      const order = await createOrder({
        user_id: user?.id,
        event_id: eventId,
        email: email.trim(),
        full_name: fullName.trim(),
        total_amount: totalAmount,
        paystack_reference: paystackReference,
        payment_status: 'pending',
        tickets: ticketsWithQR,
      });

      // Update QR codes with actual ticket IDs and order ID, and upload to storage
      if (order.id && user?.id) {
        const { data: tickets } = await supabase
          .from('tickets')
          .select('id, ticket_type_id')
          .eq('order_id', order.id)
          .order('created_at', { ascending: true });

        if (tickets && tickets.length === ticketsWithQR.length) {
          // Update each ticket's QR code with actual ticket ID and upload to storage
          for (let i = 0; i < tickets.length; i++) {
            const ticket = tickets[i];
            
            // Construct validation URL
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const validationUrl = `${baseUrl}/ticket/${ticket.id}`;
            
            const updatedQRData: QRCodeData = {
              ticketId: ticket.id,
              orderId: order.id,
              eventId: eventId,
              timestamp: Date.now(),
              validationUrl: validationUrl,
            };

            // Generate and upload QR code to storage bucket
            const qrCodeImageUrl = await generateAndUploadQRCode(updatedQRData, user.id);

            // Update ticket with QR code URL from storage and validation URL
            await supabase
              .from('tickets')
              .update({
                qr_code: validationUrl, // Store validation URL as qr_code
                qr_code_data: {
                  ...updatedQRData,
                  qrCodeImageUrl: qrCodeImageUrl, // Store storage URL
                },
              })
              .eq('id', ticket.id);
          }
        }
      }

      return { order, paystackReference };
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ orderId, paystackReference }: { orderId: string; paystackReference: string }) => {
      const result = await verifyPayment(orderId, paystackReference);
      
      if (!result.verified) {
        throw new Error(result.error || 'Payment verification failed');
      }

      return result;
    },
  });

  // Early returns after all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading event...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event not found</h1>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const updateTicketCount = (ticketId: string, delta: number) => {
    setSelectedTickets((prev) => {
      const current = prev[ticketId] || 0;
      const newCount = Math.max(0, Math.min(10, current + delta));
      if (newCount === 0) {
        const { [ticketId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [ticketId]: newCount };
    });
  };

  const handleCheckout = () => {
    if (totalTickets > 0) {
      setStep("checkout");
    }
  };

  const handlePayWithPaystack = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error('Please fill in your name and email');
      return;
    }

    if (!paystackInitialized) {
      toast.error('Payment system is loading. Please wait a moment.');
      return;
    }

    setIsProcessing(true);
    setStep("processing");

    try {
      // Create pending order with QR codes
      const result = await createOrderMutation.mutateAsync();
      const order = result.order;
      const paystackReference = result.paystackReference;

      // Open Paystack popup
      openPaystackPopup({
        email: email.trim(),
        amount: totalAmount,
        ref: paystackReference,
        metadata: {
          orderId: order.id,
          eventId: eventId,
          custom_fields: [
            {
              display_name: "Full Name",
              variable_name: "full_name",
              value: fullName.trim(),
            },
          ],
        },
        callback: async (response: any) => {
          try {
            // Verify payment on server using Paystack's reference
            await verifyPaymentMutation.mutateAsync({
              orderId: order.id,
              paystackReference: response.reference,
            });

            // Redirect to invoice page
            router.push(`/invoice/${order.id}`);
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error(error?.message || 'Payment verification failed. Please contact support.');
            setStep("checkout");
          } finally {
            setIsProcessing(false);
          }
        },
        onClose: () => {
          setIsProcessing(false);
          setStep("checkout");
          toast.info('Payment cancelled');
        },
      });
    } catch (error: any) {
      console.error('Order creation error:', error);
      toast.error(error?.message || 'Failed to create order. Please try again.');
      setIsProcessing(false);
      setStep("checkout");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Banner */}
        <div className="relative h-64 md:h-96 overflow-hidden">
          <img
            src={event.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop'}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="container mx-auto">
              <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Events
              </Link>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Event Info */}
            <div className="lg:col-span-2">
              <Badge className="bg-primary text-primary-foreground mb-4">{event.category}</Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-6">{event.title}</h1>
              
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Date & Time</div>
                    <div className="font-semibold">{format(new Date(event.date), 'EEE, MMM d, yyyy • h:mm a')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Location</div>
                    <div className="font-semibold">{event.location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Attendees</div>
                    <div className="font-semibold">{attendees} going</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Duration</div>
                    <div className="font-semibold">3-4 hours</div>
                  </div>
                </div>
              </div>

              <div className="prose prose-lg max-w-none">
                <h2 className="text-xl font-bold mb-4">About This Event</h2>
                <p className="text-muted-foreground whitespace-pre-line">
                  {event.description || `Join us for an unforgettable experience at ${event.title}! This event brings together students from across the university for an amazing time filled with entertainment, networking, and fun.`}
                </p>
              </div>
            </div>

            {/* Ticket Selection / Checkout */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-card rounded-2xl border border-border shadow-card overflow-hidden">
                {step === "select" && (
                  <>
                    <div className="p-6 border-b border-border">
                      <h2 className="text-xl font-bold">Select Tickets</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      {ticketTypes.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No tickets available for this event.</p>
                      ) : (
                        ticketTypes.map((ticket: any) => (
                        <div key={ticket.id} className="p-4 bg-background rounded-xl border border-border">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-semibold">{ticket.name}</div>
                              <div className="text-sm text-muted-foreground">{ticket.description}</div>
                            </div>
                            <div className="text-lg font-bold text-primary">
                              {ticket.is_free ? 'Free' : `₦${ticket.price}`}
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-3 mt-3">
                            <button
                              onClick={() => updateTicketCount(ticket.id, -1)}
                              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-semibold">
                              {selectedTickets[ticket.id] || 0}
                            </span>
                            {ticket.quantity && (
                              <span className="text-xs text-muted-foreground">
                                / {ticket.quantity - (ticket.sold_count || 0)} left
                              </span>
                            )}
                            <button
                              onClick={() => updateTicketCount(ticket.id, 1)}
                              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 transition-all"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        ))
                      )}
                    </div>
                    <div className="p-6 border-t border-border bg-muted/30">
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal ({totalTickets} {totalTickets === 1 ? 'ticket' : 'tickets'})</span>
                          <span className="font-medium">₦{ticketAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Service Charge</span>
                          <span className="font-medium">₦{SERVICE_CHARGE.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-border">
                          <span className="font-semibold">Total</span>
                          <span className="text-2xl font-bold">₦{totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                      <Button 
                        variant="hero" 
                        className="w-full" 
                        size="lg"
                        onClick={handleCheckout}
                        disabled={totalTickets === 0}
                      >
                        Continue to Checkout
                      </Button>
                    </div>
                  </>
                )}

                {step === "checkout" && (
                  <>
                    <div className="p-6 border-b border-border">
                      <button 
                        onClick={() => setStep("select")}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <h2 className="text-xl font-bold">Checkout</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input 
                          id="fullName"
                          type="text" 
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="mt-2"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input 
                          id="email"
                          type="email" 
                          placeholder="john@university.edu"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="mt-2"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Your payment is processed securely by Paystack
                      </div>
                    </div>
                    <div className="p-6 border-t border-border bg-muted/30">
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">₦{ticketAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Service Charge</span>
                          <span className="font-medium">₦{SERVICE_CHARGE.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-border">
                          <span className="font-semibold">Total</span>
                          <span className="text-2xl font-bold">₦{totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                      <Button 
                        variant="hero" 
                        className="w-full" 
                        size="lg"
                        onClick={handlePayWithPaystack}
                        disabled={!fullName.trim() || !email.trim() || !paystackInitialized || isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          `Pay ₦${totalAmount.toLocaleString()}`
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {step === "processing" && (
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Processing Payment</h2>
                    <p className="text-muted-foreground mb-6">
                      Please complete your payment in the popup window...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

