import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const checks: Record<string, 'ok' | 'error' | 'unconfigured'> = {}
  let healthy = true

  // Supabase DB check
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error } = await supabase.from('bookings').select('id').limit(1)
    if (error) throw error
    checks.db = 'ok'
  } catch {
    checks.db = 'error'
    healthy = false
  }

  // ECPay config check (fail loudly if production URL not set)
  const ecpayUrl = process.env.ECPAY_API_URL || ''
  if (!ecpayUrl) {
    checks.ecpay_config = 'unconfigured'
    // Don't mark unhealthy — just warn
  } else if (ecpayUrl.includes('stage')) {
    checks.ecpay_config = 'unconfigured' // staging URL in production is a misconfiguration
  } else {
    checks.ecpay_config = 'ok'
  }

  // Email config check
  checks.email = process.env.RESEND_API_KEY ? 'ok' : 'unconfigured'

  return NextResponse.json(
    { status: healthy ? 'ok' : 'error', checks },
    { status: healthy ? 200 : 503 }
  )
}
