import nodemailer from 'nodemailer'

// Email configuration interface
interface EmailConfig {
  from: string
  to: string
  subject: string
  html: string
}

// Create reusable transporter
const createTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration is missing. Please check your environment variables.')
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Send email function
export const sendEmail = async (config: EmailConfig): Promise<void> => {
  try {
    const transporter = createTransporter()
    
    await transporter.sendMail({
      from: config.from || process.env.SMTP_FROM || process.env.SMTP_USER,
      to: config.to,
      subject: config.subject,
      html: config.html,
    })

    console.log('Email sent successfully to:', config.to)
  } catch (error: any) {
    console.error('Error sending email:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

// Generate email HTML template base
export const getEmailBase = (content: string, title?: string) => {
  const primaryColor = '#FF6B00' // hsl(28 96% 52%)
  const backgroundColor = '#F5F0E8' // hsl(44 67% 93%)
  const textColor = '#212121' // hsl(0 0% 13%)
  const borderColor = '#E6D9C5' // hsl(43 40% 80%)
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Frecks'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; background-color: ${backgroundColor};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px; text-align: center;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px 30px; text-align: center; background-color: ${backgroundColor};">
              <div style="width: 48px; height: 48px; border-radius: 12px; background-color: ${primaryColor}; margin: 0 auto 16px; display: inline-block; line-height: 48px; text-align: center;">
                <span style="color: #FFFFFF; font-size: 24px;">🎫</span>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: ${primaryColor};">Frecks</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center; background-color: ${backgroundColor}; border-top: 1px solid ${borderColor};">
              <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
                © ${new Date().getFullYear()} Frecks. All rights reserved.<br>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://frecks.com'}" style="color: ${primaryColor}; text-decoration: none;">Visit our website</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

// Welcome email template
export const getWelcomeEmailHTML = (userName: string) => {
  const primaryColor = '#FF6B00'
  
  const content = `
    <div style="text-align: center;">
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #212121;">Welcome to Frecks, ${userName}! 🎉</h2>
      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #666666;">
        We're excited to have you join our community! Get ready to discover amazing events and connect with creators.
      </p>
      <div style="margin: 32px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://frecks.com'}" 
           style="display: inline-block; padding: 14px 32px; background-color: ${primaryColor}; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 107, 0, 0.3);">
          Browse Events
        </a>
      </div>
      <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #999999;">
        If you're a creator, you can start creating and selling tickets right away!
      </p>
    </div>
  `
  
  return getEmailBase(content, 'Welcome to Frecks')
}

// Ticket purchase email template
export const getTicketEmailHTML = (
  userName: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  ticketCount: number,
  totalAmount: number,
  orderId: string
) => {
  const primaryColor = '#FF6B00'
  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://frecks.com'}/invoice/${orderId}`
  
  const content = `
    <div>
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background-color: #F5F0E8; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <span style="font-size: 32px;">✅</span>
        </div>
        <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #212121;">Ticket Purchase Confirmed!</h2>
        <p style="margin: 0; font-size: 16px; color: #666666;">Your tickets are ready, ${userName}</p>
      </div>
      
      <div style="background-color: #F5F0E8; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <h3 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #212121;">${eventTitle}</h3>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
            <strong style="color: #212121;">📅 Date:</strong> ${eventDate}
          </p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
            <strong style="color: #212121;">📍 Location:</strong> ${eventLocation}
          </p>
        </div>
        <div>
          <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
            <strong style="color: #212121;">🎫 Tickets:</strong> ${ticketCount} ${ticketCount === 1 ? 'ticket' : 'tickets'}
          </p>
        </div>
      </div>
      
      <div style="background-color: #FFFFFF; border: 1px solid #E6D9C5; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-size: 16px; color: #666666;">Total Amount:</span>
          <span style="font-size: 20px; font-weight: 700; color: ${primaryColor};">₦${totalAmount.toLocaleString()}</span>
        </div>
        <div style="border-top: 1px solid #E6D9C5; padding-top: 12px; margin-top: 12px;">
          <p style="margin: 0; font-size: 12px; color: #999999;">Order ID: ${orderId.slice(0, 8)}...</p>
        </div>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${invoiceUrl}" 
           style="display: inline-block; padding: 14px 32px; background-color: ${primaryColor}; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 107, 0, 0.3);">
          See Ticket
        </a>
      </div>
      
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E6D9C5;">
        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #212121;">Important Information:</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #666666;">
          <li>Your tickets are available in your account</li>
          <li>Show your QR code at the event entrance</li>
          <li>Keep this email for your records</li>
        </ul>
      </div>
    </div>
  `
  
  return getEmailBase(content, 'Your Tickets Are Ready')
}

