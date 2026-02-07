'use client'

import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function TicketDetailPage() {
  const params = useParams()
  const id = params.id as string

  // TODO: Fetch ticket from Supabase and display QR code

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          <h1>Ticket {id}</h1>
          {/* TODO: Display ticket with QR code */}
        </div>
      </main>
      <Footer />
    </div>
  )
}

