import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, getWelcomeEmailHTML, getTicketEmailHTML } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Email type is required' },
        { status: 400 }
      )
    }

    let emailHTML: string
    let subject: string
    let to: string

    switch (type) {
      case 'welcome':
        if (!data.userName || !data.email) {
          return NextResponse.json(
            { error: 'userName and email are required for welcome email' },
            { status: 400 }
          )
        }
        emailHTML = getWelcomeEmailHTML(data.userName)
        subject = 'Welcome to Frecks! 🎉'
        to = data.email
        break

      case 'ticket':
        if (!data.userName || !data.email || !data.eventTitle || !data.eventDate || !data.eventLocation || !data.ticketCount || !data.totalAmount || !data.orderId) {
          return NextResponse.json(
            { error: 'Missing required fields for ticket email' },
            { status: 400 }
          )
        }
        emailHTML = getTicketEmailHTML(
          data.userName,
          data.eventTitle,
          data.eventDate,
          data.eventLocation,
          data.ticketCount,
          data.totalAmount,
          data.orderId
        )
        subject = 'Your Tickets Are Ready! 🎫'
        to = data.email
        break

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    await sendEmail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@frecks.com',
      to,
      subject,
      html: emailHTML,
    })

    return NextResponse.json({ success: true, message: 'Email sent successfully' })
  } catch (error: any) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

