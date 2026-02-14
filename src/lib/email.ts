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
    secure: process.env.SMTP_PORT === '465',
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

// ─── Shared Design Tokens ─────────────────────────────────────────────────────
const T = {
  primary:      '#FF6B00',
  primaryLight: '#FF8C3A',
  bg:           '#F5F0E8',
  card:         '#FFFAF3',
  dark:         '#212121',
  muted:        '#666666',
  faint:        '#999999',
  border:       '#E6D9C5',
  pillBg:       '#FFF5ED',
  pillBorder:   '#F5D7BC',
  font:         "'Poppins', ui-sans-serif, system-ui, sans-serif",
  appUrl:       process.env.NEXT_PUBLIC_APP_URL || 'https://frecks.live',
}

// ─── Social Icons Footer ──────────────────────────────────────────────────────
const socialLinks = `
  <table role="presentation" style="margin: 20px auto 0; border-collapse: collapse;">
    <tr>
      <td style="padding: 0 6px;">
        <a href="https://facebook.com/frecks" style="display:inline-block;width:36px;height:36px;background-color:#1877F2;border-radius:50%;text-align:center;line-height:36px;text-decoration:none;font-size:18px;" title="Facebook">
          <span style="color:#ffffff;">f</span>
        </a>
      </td>
      <td style="padding: 0 6px;">
        <a href="https://instagram.com/frecks" style="display:inline-block;width:36px;height:36px;background:linear-gradient(45deg,#F58529,#DD2A7B,#8134AF,#515BD4);border-radius:50%;text-align:center;line-height:36px;text-decoration:none;font-size:18px;" title="Instagram">
          <span style="color:#ffffff;font-weight:bold;">IG</span>
        </a>
      </td>
      <td style="padding: 0 6px;">
        <a href="https://tiktok.com/@frecks" style="display:inline-block;width:36px;height:36px;background-color:#000000;border-radius:50%;text-align:center;line-height:36px;text-decoration:none;font-size:18px;" title="TikTok">
          <span style="color:#ffffff;font-weight:bold;">TT</span>
        </a>
      </td>
      <td style="padding: 0 6px;">
        <a href="https://x.com/frecks" style="display:inline-block;width:36px;height:36px;background-color:#000000;border-radius:50%;text-align:center;line-height:36px;text-decoration:none;font-size:18px;" title="X">
          <span style="color:#ffffff;font-weight:bold;">𝕏</span>
        </a>
      </td>
    </tr>
  </table>
`

// ─── Base Layout ──────────────────────────────────────────────────────────────
export const getEmailBase = (content: string, title?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title || 'Frecks'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:${T.bg};font-family:${T.font};-webkit-font-smoothing:antialiased;">

  <table role="presentation" width="100%" style="border-collapse:collapse;">
    <tr>
      <td style="padding:40px 16px;">
        <table role="presentation" style="max-width:560px;margin:0 auto;background-color:${T.card};border:1px solid ${T.border};border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(255,107,0,0.06),0 2px 8px rgba(33,33,33,0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color:${T.dark};padding:28px 36px;">
              <img
                src="https://ynkvvjkokwwnqoujeznu.supabase.co/storage/v1/object/public/logo/frecks%20no%20back.png"
                alt="Frecks"
                height="40"
                style="display:block;"
              />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 36px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${T.bg};border-top:1px solid ${T.border};padding:28px 36px;text-align:center;">
              ${socialLinks}
              <p style="margin:20px 0 6px;font-size:12px;color:${T.faint};line-height:1.6;font-family:${T.font};">
                &copy; ${new Date().getFullYear()} Frecks. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;font-family:${T.font};">
                <a href="${T.appUrl}" style="color:${T.primary};text-decoration:none;">Visit our website</a>
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

// ─── Shared: CTA Button ───────────────────────────────────────────────────────
const ctaButton = (href: string, label: string) => `
  <a href="${href}"
     style="display:inline-block;background:linear-gradient(135deg,${T.primary} 0%,${T.primaryLight} 100%);color:#ffffff;text-decoration:none;font-family:${T.font};font-size:14px;font-weight:600;letter-spacing:0.3px;padding:14px 36px;border-radius:50px;box-shadow:0 4px 18px rgba(255,107,0,0.35);margin-top:28px;">
    ${label}
  </a>
`

// ─── Shared: Divider ──────────────────────────────────────────────────────────
const divider = `<div style="border-top:1px solid ${T.border};margin:32px 0;"></div>`

// ─── Shared: Fallback Link ────────────────────────────────────────────────────
const fallbackLink = (url: string) => `
  ${divider}
  <p style="margin:0 0 8px;font-size:12px;color:${T.faint};font-family:${T.font};">Button not working? Copy and paste this link into your browser:</p>
  <a href="${url}" style="display:block;font-size:11px;color:${T.primary};word-break:break-all;text-decoration:none;background:${T.pillBg};border:1px solid ${T.pillBorder};border-radius:8px;padding:10px 12px;font-family:monospace;">${url}</a>
`

// ─── Welcome Email ────────────────────────────────────────────────────────────
export const getWelcomeEmailHTML = (userName: string) => {
  const content = `
    <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,${T.primary} 0%,${T.primaryLight} 100%);display:inline-block;box-shadow:0 4px 16px rgba(255,107,0,0.3);margin-bottom:24px;text-align:center;line-height:52px;">
      <span style="font-size:24px;">🎫</span>
    </div>

    <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:${T.dark};line-height:1.3;font-family:${T.font};">
      Welcome to Frecks,<br/>${userName}! 🎉
    </h1>

    <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:${T.muted};font-family:${T.font};">
      We're excited to have you on board. Discover amazing events, buy tickets in seconds, and connect with creators — all in one place.
    </p>

    <table role="presentation" style="border-collapse:collapse;margin-bottom:8px;">
      <tr>
        <td style="padding:0 0 10px;">
          <div style="display:inline-block;background:${T.pillBg};border:1px solid ${T.pillBorder};border-radius:50px;padding:8px 16px;font-size:13px;color:${T.dark};font-family:${T.font};">
            🎟️ &nbsp;Buy tickets instantly
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 10px;">
          <div style="display:inline-block;background:${T.pillBg};border:1px solid ${T.pillBorder};border-radius:50px;padding:8px 16px;font-size:13px;color:${T.dark};font-family:${T.font};">
            🎤 &nbsp;Create &amp; sell your own events
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 10px;">
          <div style="display:inline-block;background:${T.pillBg};border:1px solid ${T.pillBorder};border-radius:50px;padding:8px 16px;font-size:13px;color:${T.dark};font-family:${T.font};">
            📲 &nbsp;QR code entry — no printing needed
          </div>
        </td>
      </tr>
    </table>

    ${ctaButton(T.appUrl, 'Browse Events')}
  `
  return getEmailBase(content, 'Welcome to Frecks')
}

// ─── Ticket Purchase Email ────────────────────────────────────────────────────
export const getTicketEmailHTML = (
  userName: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  ticketCount: number,
  totalAmount: number,
  orderId: string
) => {
  const invoiceUrl = `${T.appUrl}/invoice/${orderId}`

  const content = `
    <div style="display:inline-block;background:#ECFDF3;border:1px solid #A7F3C0;border-radius:50px;padding:6px 14px;margin-bottom:24px;">
      <span style="font-size:12px;font-weight:600;color:#16A34A;font-family:${T.font};">✓ &nbsp;Purchase confirmed</span>
    </div>

    <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:${T.dark};line-height:1.3;font-family:${T.font};">
      Your tickets are ready, ${userName}
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${T.muted};font-family:${T.font};">
      Order <span style="color:${T.dark};font-weight:500;">#${orderId.slice(0, 8).toUpperCase()}</span>
    </p>

    <!-- Event card -->
    <table role="presentation" width="100%" style="border-collapse:collapse;background:${T.bg};border:1px solid ${T.border};border-radius:14px;overflow:hidden;margin-bottom:24px;">
      <tr>
        <td style="background:linear-gradient(135deg,${T.primary} 0%,${T.primaryLight} 100%);padding:14px 20px;">
          <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;font-family:${T.font};">${eventTitle}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px;">
          <table role="presentation" style="border-collapse:collapse;width:100%;">
            <tr>
              <td style="padding:0 0 12px;">
                <p style="margin:0;font-size:11px;color:${T.faint};font-family:${T.font};text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Date &amp; Time</p>
                <p style="margin:4px 0 0;font-size:14px;color:${T.dark};font-weight:500;font-family:${T.font};">${eventDate}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-top:1px solid ${T.border};">
                <p style="margin:0;font-size:11px;color:${T.faint};font-family:${T.font};text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Location</p>
                <p style="margin:4px 0 0;font-size:14px;color:${T.dark};font-weight:500;font-family:${T.font};">${eventLocation}</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;border-top:1px solid ${T.border};">
                <table role="presentation" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td>
                      <p style="margin:0;font-size:11px;color:${T.faint};font-family:${T.font};text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Tickets</p>
                      <p style="margin:4px 0 0;font-size:14px;color:${T.dark};font-weight:500;font-family:${T.font};">${ticketCount} ${ticketCount === 1 ? 'ticket' : 'tickets'}</p>
                    </td>
                    <td style="text-align:right;">
                      <p style="margin:0;font-size:11px;color:${T.faint};font-family:${T.font};text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Total</p>
                      <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${T.primary};font-family:${T.font};">₦${totalAmount.toLocaleString()}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Info callout -->
    <table role="presentation" width="100%" style="border-collapse:collapse;border-left:3px solid ${T.primary};">
      <tr>
        <td style="padding-left:14px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${T.dark};font-family:${T.font};">Before you go</p>
          <p style="margin:0 0 4px;font-size:13px;color:${T.muted};line-height:1.6;font-family:${T.font};">• Your tickets are saved in your Frecks account</p>
          <p style="margin:0 0 4px;font-size:13px;color:${T.muted};line-height:1.6;font-family:${T.font};">• Show your QR code at the entrance</p>
          <p style="margin:0;font-size:13px;color:${T.muted};line-height:1.6;font-family:${T.font};">• Keep this email as your receipt</p>
        </td>
      </tr>
    </table>

    ${ctaButton(invoiceUrl, 'View My Ticket')}
  `

  return getEmailBase(content, 'Your Tickets Are Ready – Frecks')
}