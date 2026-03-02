import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface BookingRow {
  id: string
  status: string
  cleaner_id: string
  cleaner_payout: number
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
    .select('id, status, cleaner_id, cleaner_payout')
    .eq('id', bookingId)
    .eq('customer_id', user.id)
    .single()

  const booking = rawBooking as BookingRow | null

  if (!booking) return NextResponse.json({ error: '訂單不存在' }, { status: 404 })
  if (booking.status !== 'completed') {
    return NextResponse.json({ error: '訂單狀態不允許此操作' }, { status: 400 })
  }

  const now = new Date().toISOString()
  // Payout eligible after 14 days
  const eligibleAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  // Update booking to customer_confirmed
  const { error: updateErr } = await sb
    .from('bookings')
    .update({ status: 'customer_confirmed', customer_confirmed_at: now })
    .eq('id', bookingId)

  if (updateErr) {
    console.error('confirm booking error:', updateErr.message)
    return NextResponse.json({ error: '確認失敗，請稍後再試' }, { status: 500 })
  }

  // Create payout record (best-effort)
  const { error: payoutErr } = await sb.from('payouts').insert({
    booking_id: bookingId,
    cleaner_id: booking.cleaner_id,
    amount: booking.cleaner_payout,
    status: 'pending',
    eligible_at: eligibleAt,
  })
  if (payoutErr) console.error('payout insert error:', payoutErr.message)

  // Log status change
  await sb.from('booking_status_logs').insert({
    booking_id: bookingId,
    from_status: 'completed',
    to_status: 'customer_confirmed',
    changed_by: user.id,
    notes: '客戶確認驗收',
  })

  // Notify cleaner
  const { data: cleaner } = await sb
    .from('cleaners')
    .select('profile_id')
    .eq('id', booking.cleaner_id)
    .single()

  if (cleaner?.profile_id) {
    await sb.from('notifications').insert({
      user_id: cleaner.profile_id,
      type: 'customer_confirmed',
      title: '客戶已確認驗收',
      body: '客戶已確認服務完成，款項將在 14 天後撥款至你的帳戶。',
      data: { booking_id: bookingId },
    })
  }

  return NextResponse.json({ success: true })
}
