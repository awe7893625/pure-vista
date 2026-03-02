import { NextRequest, NextResponse } from 'next/server'
import { verifyECPayCallback } from '@/lib/ecpay'
import { createClient } from '@supabase/supabase-js'
import { sendNewBookingToCleanerEmail } from '@/lib/email'

// ECPay Notify: server-to-server, must use service role (no cookies)
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const params: Record<string, string> = {}
  formData.forEach((value, key) => {
    params[key] = String(value)
  })

  // Log raw params for audit trail (before signature check)
  console.log('ECPay notify raw params:', JSON.stringify({
    MerchantTradeNo: params.MerchantTradeNo,
    RtnCode: params.RtnCode,
    RtnMsg: params.RtnMsg,
    PaymentType: params.PaymentType,
    TradeAmt: params.TradeAmt,
    PaymentDate: params.PaymentDate,
    timestamp: new Date().toISOString(),
  }))

  const hashKey = process.env.ECPAY_HASH_KEY!
  const hashIv = process.env.ECPAY_HASH_IV!

  // Verify signature
  if (!verifyECPayCallback(params, hashKey, hashIv)) {
    console.error('ECPay notify: invalid CheckMacValue', { MerchantTradeNo: params.MerchantTradeNo })
    return new NextResponse('0|ErrorMacValue', { status: 200 })
  }

  const { RtnCode, MerchantTradeNo, TradeNo } = params
  const supabase = createServiceClient()

  // Find payment by booking_number (MerchantTradeNo)
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, cleaner_id, customer_id, total_amount')
    .eq('booking_number', MerchantTradeNo)
    .single()

  if (!booking) {
    console.error('ECPay notify: booking not found for', MerchantTradeNo)
    return new NextResponse('0|OrderNotFound', { status: 200 })
  }

  // Only process if still pending
  if (booking.status !== 'pending_payment') {
    return new NextResponse('1|OK', { status: 200 })
  }

  if (RtnCode === '1') {
    // Payment success — update booking status first; if it fails, return error so ECPay retries
    const now = new Date().toISOString()

    const { error: bookingErr } = await supabase
      .from('bookings')
      .update({ status: 'paid', paid_at: now })
      .eq('id', booking.id)

    if (bookingErr) {
      console.error('ECPay notify: failed to update booking', bookingErr.message)
      return new NextResponse('0|DBError', { status: 200 })
    }

    // Subsequent writes are best-effort — log failures but don't fail the webhook
    const { error: paymentErr } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        ecpay_transaction_id: TradeNo,
        paid_at: now,
        raw_notify: params,
      })
      .eq('booking_id', booking.id)
    if (paymentErr) console.error('ECPay notify: payment update failed', paymentErr.message)

    const { error: logErr } = await supabase.from('booking_status_logs').insert({
      booking_id: booking.id,
      from_status: 'pending_payment',
      to_status: 'paid',
      notes: `ECPay TradeNo: ${TradeNo}`,
    })
    if (logErr) console.error('ECPay notify: status log insert failed', logErr.message)

    await supabase.from('notifications').insert({
      user_id: booking.customer_id,
      type: 'payment_received',
      title: '付款成功',
      body: '你的清潔預約付款已成功，等待清潔師確認。',
      data: { booking_id: booking.id },
    })

    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('profile_id')
      .eq('id', booking.cleaner_id)
      .single()

    if (cleaner) {
      await supabase.from('notifications').insert({
        user_id: cleaner.profile_id,
        type: 'booking_created',
        title: '新預約！',
        body: '你有一筆新的清潔預約，請前往後台確認。',
        data: { booking_id: booking.id },
      })

      // Send email to cleaner
      const { data: fullBooking } = await supabase
        .from('bookings')
        .select('scheduled_date, scheduled_start_time, address, total_amount, service:services(title)')
        .eq('id', booking.id)
        .single()

      const { data: cleanerProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', cleaner.profile_id)
        .single()

      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', booking.customer_id)
        .single()

      if (fullBooking && cleanerProfile?.email && customerProfile) {
        const svc = fullBooking.service as unknown as { title: string } | null
        sendNewBookingToCleanerEmail({
          cleanerEmail: cleanerProfile.email,
          cleanerName: cleanerProfile.full_name || '清潔師',
          customerName: customerProfile.full_name || '客戶',
          serviceTitle: svc?.title || '清潔服務',
          scheduledDate: new Date(fullBooking.scheduled_date).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }),
          scheduledStartTime: String(fullBooking.scheduled_start_time).substring(0, 5),
          address: fullBooking.address,
          totalAmount: booking.total_amount,
        }).catch(err => console.error('ECPay notify: email to cleaner failed', err))
      }
    }
  } else {
    // Payment failed
    await supabase
      .from('payments')
      .update({ status: 'failed', raw_notify: params })
      .eq('booking_id', booking.id)
  }

  return new NextResponse('1|OK', { status: 200 })
}
