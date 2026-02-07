import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const Scanner = () => {
  // TODO: Implement QR code scanner using html5-qrcode

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">Scan Ticket QR Code</h1>
          {/* TODO: Add QR scanner component */}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Scanner

