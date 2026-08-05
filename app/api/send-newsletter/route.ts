import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '../../supabaseClient'
export async function POST(req: Request) {
  try {
    const { title, htmlContent } = await req.json()

    if (!title || !htmlContent) {
      return NextResponse.json(
        { error: 'Title and content are required.' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // 1. Fetch all subscriber emails
    const { data: subscribers, error: dbError } = await supabase
      .from('newsletter_subscribers')
      .select('email')

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json(
        { message: 'Post published, but no newsletter subscribers found.' },
        { status: 200 }
      )
    }

    const recipientList = subscribers.map((s) => s.email)

    // 2. Configure Nodemailer with Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    // 3. Send Email Blast using BCC to protect user privacy
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
    console.error('Newsletter sending error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}