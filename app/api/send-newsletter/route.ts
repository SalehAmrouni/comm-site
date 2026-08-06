import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '../../supabaseClient' // Adjust relative path if needed

// 1. Force Next.js to use Node.js runtime (Nodemailer breaks on Edge)
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { title, htmlContent } = await req.json()

    if (!title || !htmlContent) {
      return NextResponse.json(
        { error: 'Title and content are required.' },
        { status: 400 }
      )
    }

    // Check if env variables are present
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('MISSING ENV VARS: GMAIL_USER or GMAIL_APP_PASSWORD is not set.')
      return NextResponse.json(
        { error: 'Server misconfiguration: GMAIL environment variables missing.' },
        { status: 500 }
      )
    }

    const supabase = createClient()

    // 2. Fetch subscribers from Supabase
    const { data: subscribers, error: dbError } = await supabase
      .from('newsletter_subscribers')
      .select('email')

    if (dbError) {
      return NextResponse.json({ error: `Supabase DB Error: ${dbError.message}` }, { status: 500 })
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json(
        { message: 'Post published, but no newsletter subscribers found in database.' },
        { status: 200 }
      )
    }

    const recipientList = subscribers.map((s) => s.email)

    // 3. Configure Gmail Transporter using explicit SSL Port 465
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Port 465 SSL is much more reliable on cloud hostings like Vercel
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    // Verify SMTP connection before sending
    await transporter.verify()

    // 4. Send Email Blast
    await transporter.sendMail({
      from: `"COMMISSIONERS" <${process.env.GMAIL_USER}>`,
      bcc: recipientList,
      subject: title,
      html: `
        <div style="font-family: monospace; background-color: #000; color: #fff; padding: 20px; border: 4px solid #fff;">
          <h1 style="color: #facc15; text-transform: uppercase;">${title}</h1>
          <hr style="border-color: #333;" />
          <div style="margin-top: 15px; font-size: 14px; line-height: 1.6;">
            ${htmlContent}
          </div>
          <hr style="border-color: #333; margin-top: 30px;" />
          <p style="font-size: 10px; color: #888; text-transform: uppercase;">
            You are receiving this because you subscribed to the COMMISSIONERS Newsletter.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, count: recipientList.length })
  } catch (err: any) {
    console.error('SMTP Delivery Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}