import { NextRequest, NextResponse } from 'next/server'
import { verifyECPayCallback } from '@/lib/ecpay'
import { createClient } from '@/lib/supabase/server'

interface BookingRow {
  id: string
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const params: Record<string, string> = {}
  formData.forEach((value, key) => {
    params[key] = String(value)
  })

  const hashKey = process.env.ECPAY_HASH_KEY!
  const hashIv = process.env.ECPAY_HASH_IV!

  if (!verifyECPayCallback(params, hashKey, hashIv)) {
    return NextResponse.redirect(new URL('/?payment=error', request.url))
  }

  const { RtnCode, MerchantTradeNo } = params

  if (RtnCode !== '1') {
    return NextResponse.redirect(new URL('/?payment=failed', request.url))
  }

  // Find booking to redirect to correct detail page
  const supabase = await createClient()
  const { data: rawBooking } = await supabase
    .from('bookings')
    .select('id')
    .eq('booking_number', MerchantTradeNo)
    .single()

  const booking = rawBooking as unknown as BookingRow | null

  if (!booking) {
    return NextResponse.redirect(new URL('/account/bookings', request.url))
  }

  return NextResponse.redirect(
    new URL(`/account/bookings/${booking.id}?status=success`, request.url)
  )
}
