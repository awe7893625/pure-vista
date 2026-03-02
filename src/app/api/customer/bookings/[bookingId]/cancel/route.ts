import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface BookingRow {
  id: string
  status: string
  cleaner_id: string
  total_amount: number
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: rawBooking } = await sb
    .from('bookings')
    .select('id, status, cleaner_id, total_amount')
    .eq('id', bookingId)
    .eq('customer_id', user.id)
    .single()

  const booking = rawBooking as BookingRow | null
  if (!booking) return NextResponse.json({ error: '訂單不存在' }, { status: 404 })

  // Only allow cancel before service starts
  if (!['paid', 'confirmed'].includes(booking.status)) {
    return NextResponse.json({ error: '此訂單狀態無法取消' }, { status: 400 })
  }

  const now = new Date().toISOString()

  const { error: cancelError } = await sb
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: now, cancellation_reason: '客戶取消' })
    .eq('id', bookingId)

  if (cancelError) {
    console.error('Cancel booking DB error:', cancelError)
    return NextResponse.json({ error: '取消失敗，請稍後再試' }, { status: 500 })
  }

  // Mark payment as needing refund
  const { error: paymentError } = await sb
    .from('payments')
    .update({ status: 'refund_pending' })
    .eq('booking_id', bookingId)
    .eq('status', 'paid')

  if (paymentError) {
    console.error('Cancel payment update error:', paymentError)
    // Booking already cancelled — log but don't block response
  }

  await sb.from('booking_status_logs').insert({
    booking_id: bookingId,
    from_status: booking.status,
    to_status: 'cancelled',
    changed_by: user.id,
    notes: '客戶取消，待退款',
  })

  // Notify cleaner (fire-and-forget)
  sb.from('notifications').insert({
    user_id: booking.cleaner_id,
    type: 'booking_cancelled',
    title: '客戶已取消預約',
    body: '客戶取消了此預約，時段已釋放。',
    data: { booking_id: bookingId },
  }).then(({ error }: { error: unknown }) => {
    if (error) console.error('Cancel notification error:', error)
  })

  return NextResponse.json({ success: true })
}
