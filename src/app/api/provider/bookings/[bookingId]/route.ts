import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_PROVIDER_TRANSITIONS: Record<string, string> = {
  paid: 'confirmed',
  confirmed: 'in_progress',
  in_progress: 'completed',
}

interface CleanerRow {
  id: string
}

interface BookingRow {
  id: string
  status: string
  customer_id: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rawCleaner } = await supabase
    .from('cleaners')
    .select('id')
    .eq('profile_id', user.id)
    .eq('status', 'approved')
    .single()

  const cleaner = rawCleaner as unknown as CleanerRow | null

  if (!cleaner) return NextResponse.json({ error: 'Not an approved cleaner' }, { status: 403 })

  const { data: rawBooking } = await supabase
    .from('bookings')
    .select('id, status, customer_id')
    .eq('id', bookingId)
    .eq('cleaner_id', cleaner.id)
    .single()

  const booking = rawBooking as unknown as BookingRow | null

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const body = await request.json()
  const { status: newStatus, notes } = body

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Allow cancellation from paid/confirmed
  if (newStatus === 'cancelled' && ['paid', 'confirmed'].includes(booking.status)) {
    const now = new Date().toISOString()
    await sb
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: now, cancellation_reason: notes || '清潔師取消' })
      .eq('id', bookingId)

    await sb.from('booking_status_logs').insert({
      booking_id: bookingId,
      from_status: booking.status,
      to_status: 'cancelled',
      changed_by: user.id,
      notes: notes || '清潔師取消',
    })

    // Notify customer
    await sb.from('notifications').insert({
      user_id: booking.customer_id,
      type: 'booking_cancelled',
      title: '預約已取消',
      body: '清潔師已取消此預約，請重新安排。',
      data: { booking_id: bookingId },
    })

    return NextResponse.json({ success: true })
  }

  // Check valid transitions
  const expectedNewStatus = VALID_PROVIDER_TRANSITIONS[booking.status]
  if (newStatus !== expectedNewStatus) {
    return NextResponse.json({ error: `無效的狀態轉換 ${booking.status} → ${newStatus}` }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { status: newStatus }
  const now = new Date().toISOString()

  if (newStatus === 'confirmed') updateData.confirmed_at = now
  if (newStatus === 'completed') updateData.completed_at = now

  await sb.from('bookings').update(updateData).eq('id', bookingId)

  await sb.from('booking_status_logs').insert({
    booking_id: bookingId,
    from_status: booking.status,
    to_status: newStatus,
    changed_by: user.id,
    notes,
  })

  // Notify customer on confirmation
  if (newStatus === 'confirmed') {
    await sb.from('notifications').insert({
      user_id: booking.customer_id,
      type: 'booking_confirmed',
      title: '清潔師已確認預約',
      body: '你的預約已被清潔師確認，請準時等候服務。',
      data: { booking_id: bookingId },
    })
  }

  return NextResponse.json({ success: true })
}
