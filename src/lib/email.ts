const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pure-vista-app.netlify.app'
const FROM = '澄境清潔 <no-reply@somethings.cool>'
const RESEND_KEY = process.env.RESEND_API_KEY

// Brand tokens
const COLOR = {
  primary: '#8FAD82',
  bg: '#F8F9F6',
  text: '#1A1A1A',
  muted: '#6B7280',
} as const

function baseLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:${COLOR.bg};font-family:Helvetica Neue,Arial,system-ui,sans-serif;color:${COLOR.text};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:${COLOR.primary};padding:32px 40px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">澄境清潔 Pure Vista</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #F0F0F0;text-align:center;">
              <p style="margin:0;font-size:13px;color:${COLOR.muted};">© 2026 澄境清潔 Pure Vista</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function infoTable(rows: { label: string; value: string }[]): string {
  const cells = rows.map(({ label, value }) => `
    <tr>
      <td style="padding:10px 0;font-size:14px;color:${COLOR.muted};width:120px;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;font-size:14px;color:${COLOR.text};font-weight:500;vertical-align:top;">${value}</td>
    </tr>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${cells}</table>`
}

function ctaButton(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${COLOR.primary};color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">${text}</a>`
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NewBookingToCleanerParams {
  cleanerEmail: string
  cleanerName: string
  customerName: string
  serviceTitle: string
  scheduledDate: string       // e.g. "2026年3月17日"
  scheduledStartTime: string  // e.g. "09:00"
  address: string
  totalAmount: number
}

export interface BookingConfirmedToCustomerParams {
  customerEmail: string
  customerName: string
  cleanerName: string
  cleanerPhone: string
  serviceTitle: string
  scheduledDate: string
  scheduledStartTime: string
  address: string
  totalAmount: number
}

// ─── Functions ───────────────────────────────────────────────────────────────

export async function sendNewBookingToCleanerEmail(
  params: NewBookingToCleanerParams
): Promise<Response> {
  const {
    cleanerEmail,
    cleanerName,
    customerName,
    serviceTitle,
    scheduledDate,
    scheduledStartTime,
    address,
    totalAmount,
  } = params

  const htmlBody = `
    <p style="margin:0 0 8px;font-size:16px;color:${COLOR.muted};">親愛的 ${cleanerName}，</p>
    <h2 style="margin:0 0 24px;font-size:22px;font-weight:700;color:${COLOR.text};">您有一筆新預約！</h2>
    <p style="margin:0 0 20px;font-size:14px;color:${COLOR.muted};">以下是預約詳情，請至後台確認接單：</p>

    <div style="background:${COLOR.bg};border-radius:8px;padding:20px 24px;margin-bottom:28px;">
      ${infoTable([
        { label: '客戶姓名', value: customerName },
        { label: '服務項目', value: serviceTitle },
        { label: '預約日期', value: scheduledDate },
        { label: '開始時間', value: scheduledStartTime },
        { label: '服務地址', value: address },
        { label: '服務費用', value: `NT$ ${totalAmount.toLocaleString()}` },
      ])}
    </div>

    <div style="text-align:center;margin-bottom:8px;">
      ${ctaButton('前往後台確認', `${APP_URL}/provider/bookings`)}
    </div>
  `

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [cleanerEmail],
      subject: '【澄境清潔】您有一筆新預約，請至後台確認！',
      html: baseLayout(htmlBody),
    }),
  })
}

export async function sendBookingConfirmedToCustomerEmail(
  params: BookingConfirmedToCustomerParams
): Promise<Response> {
  const {
    customerEmail,
    customerName,
    cleanerName,
    cleanerPhone,
    serviceTitle,
    scheduledDate,
    scheduledStartTime,
    address,
    totalAmount,
  } = params

  const htmlBody = `
    <p style="margin:0 0 8px;font-size:16px;color:${COLOR.muted};">親愛的 ${customerName}，</p>
    <h2 style="margin:0 0 24px;font-size:22px;font-weight:700;color:${COLOR.text};">您的預約已確認！</h2>
    <p style="margin:0 0 20px;font-size:14px;color:${COLOR.muted};">清潔師已接受您的預約，以下是完整資訊：</p>

    <div style="background:${COLOR.bg};border-radius:8px;padding:20px 24px;margin-bottom:20px;">
      ${infoTable([
        { label: '清潔師姓名', value: cleanerName },
        { label: '清潔師電話', value: cleanerPhone },
        { label: '服務項目', value: serviceTitle },
        { label: '預約日期', value: scheduledDate },
        { label: '開始時間', value: scheduledStartTime },
        { label: '服務地址', value: address },
        { label: '服務費用', value: `NT$ ${totalAmount.toLocaleString()}` },
      ])}
    </div>

    <p style="margin:0 0 24px;font-size:13px;color:${COLOR.muted};padding:12px 16px;background:#FFF8EC;border-radius:6px;border-left:3px solid #F5A623;">
      ℹ️ 如需聯繫清潔師，請直接撥打上方電話
    </p>
  `

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [customerEmail],
      subject: '【澄境清潔】您的預約已確認！清潔師聯絡資訊',
      html: baseLayout(htmlBody),
    }),
  })
}
