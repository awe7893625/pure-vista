import * as crypto from 'crypto'

/**
 * Generate ECPay CheckMacValue (SHA256)
 *
 * Steps:
 * 1. Sort parameters by key (alphabetical)
 * 2. Build key=value& string
 * 3. Prepend HashKey= and append &HashIV=
 * 4. URL encode
 * 5. Lowercase
 * 6. SHA256 hash
 * 7. Uppercase
 */
export function generateCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIv: string
): string {
  // Step 1: Sort by key alphabetically
  const sorted = Object.keys(params)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = params[key]
      return acc
    }, {})

  // Step 2: Build key=value& string
  const raw = Object.entries(sorted)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  // Step 3: Prepend HashKey= and append &HashIV=
  const withKeys = `HashKey=${hashKey}&${raw}&HashIV=${hashIv}`

  // Step 4: URL encode per ECPay spec (.NET HttpUtility.UrlEncode semantics)
  // CRITICAL: space must be '+' not '%20' (unlike encodeURIComponent)
  const encoded = encodeURIComponent(withKeys)
    .replace(/%20/g, '+')   // .NET UrlEncode: space -> '+', not '%20'
    .replace(/%2d/gi, '-')
    .replace(/%5f/gi, '_')
    .replace(/%2e/gi, '.')
    .replace(/%21/gi, '!')
    .replace(/%2a/gi, '*')
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')

  // Step 5: Lowercase
  const lowered = encoded.toLowerCase()

  // Step 6: SHA256
  const hash = crypto.createHash('sha256').update(lowered).digest('hex')

  // Step 7: Uppercase
  return hash.toUpperCase()
}

export interface ECPayBookingParams {
  bookingId: string
  bookingNumber: string
  totalAmount: number
  serviceTitle: string
}

/**
 * Build ECPay auto-submit HTML form for a cleaning service booking
 */
export function buildECPayForm(booking: ECPayBookingParams): string {
  const merchantId = process.env.ECPAY_MERCHANT_ID
  const hashKey = process.env.ECPAY_HASH_KEY
  const hashIv = process.env.ECPAY_HASH_IV
  if (!merchantId || !hashKey || !hashIv) {
    throw new Error('ECPay credentials not configured (ECPAY_MERCHANT_ID, ECPAY_HASH_KEY, ECPAY_HASH_IV)')
  }

  const apiUrl =
    (process.env.ECPAY_API_URL || 'https://payment-stage.ecpay.com.tw') +
    '/Cashier/AioCheckOut/V5'

  // ReturnURL = server-to-server payment notification callback (ECPAY_NOTIFY_URL)
  // OrderResultURL = browser redirect shown to user after payment (ECPAY_RETURN_URL)
  const returnUrl =
    process.env.ECPAY_NOTIFY_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL}/api/ecpay/notify`
  const orderResultUrl =
    process.env.ECPAY_RETURN_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL}/api/ecpay/return`

  // MerchantTradeDate: yyyy/MM/dd HH:mm:ss in Taiwan Standard Time (UTC+8)
  // ECPay requires TST regardless of server timezone
  const tst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  const pad = (n: number) => String(n).padStart(2, '0')
  const tradeDate = `${tst.getFullYear()}/${pad(tst.getMonth() + 1)}/${pad(tst.getDate())} ${pad(tst.getHours())}:${pad(tst.getMinutes())}:${pad(tst.getSeconds())}`

  const params: Record<string, string> = {
    MerchantID: merchantId,
    MerchantTradeNo: booking.bookingNumber,
    MerchantTradeDate: tradeDate,
    PaymentType: 'aio',
    TotalAmount: String(Math.round(booking.totalAmount)),
    TradeDesc: `Pure Vista 清潔預約 ${booking.bookingNumber}`,
    ItemName: booking.serviceTitle,
    ReturnURL: returnUrl,
    OrderResultURL: orderResultUrl,
    ChoosePayment: 'Credit',
    EncryptType: '1',
  }

  const checkMacValue = generateCheckMacValue(params, hashKey, hashIv)
  params.CheckMacValue = checkMacValue

  const fields = Object.entries(params)
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`
    )
    .join('\n')

  return `
<!DOCTYPE html>
<html>
<body>
<form id="ecpayForm" method="POST" action="${escapeHtml(apiUrl)}">
${fields}
</form>
<script>document.getElementById('ecpayForm').submit();</script>
</body>
</html>`
}

/**
 * Verify ECPay callback CheckMacValue
 */
export function verifyECPayCallback(
  params: Record<string, string>,
  hashKey: string,
  hashIv: string
): boolean {
  const { CheckMacValue, ...rest } = params
  if (!CheckMacValue) return false

  const computed = generateCheckMacValue(rest, hashKey, hashIv)
  return computed === CheckMacValue.toUpperCase()
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
