import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBookingNumber, calculateFinancials } from '@/lib/booking'

interface ServiceRow {
  price_per_session: number
  duration_hours: number
}

interface CleanerRow {
  id: string
  status: string
}

interface ConflictRow {
  id: string
}

interface BookingRow {
  id: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const body = await request.json()
  const { cleanerId, serviceId, scheduledDate, scheduledStartTime, address, areaSqm, notes } = body

  if (!cleanerId || !serviceId || !scheduledDate || !scheduledStartTime || !address) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Validate service belongs to cleaner and is active
  const { data: rawService, error: serviceError } = await sb
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .eq('cleaner_id', cleanerId)
    .eq('is_active', true)
    .single()

  const service = rawService as ServiceRow | null

  if (serviceError || !service) {
    return NextResponse.json({ error: '服務不存在或已停用' }, { status: 404 })
  }

  // Validate cleaner is approved
  const { data: rawCleaner } = await sb
    .from('cleaners')
    .select('id, status')
    .eq('id', cleanerId)
    .eq('status', 'approved')
    .single()

  const cleaner = rawCleaner as CleanerRow | null

  if (!cleaner) {
    return NextResponse.json({ error: '清潔師不存在或未通過審核' }, { status: 404 })
  }

  // Check for scheduling conflicts
  const { data: rawConflicts } = await sb
    .from('bookings')
    .select('id')
    .eq('cleaner_id', cleanerId)
    .eq('scheduled_date', scheduledDate)
    .not('status', 'in', '("cancelled","disputed")')

  const conflicts = rawConflicts as ConflictRow[] | null

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: '該清潔師在此日期已有預約' }, { status: 409 })
  }

  const totalAmount = service.price_per_session
  const { platformCommission, cleanerPayout, commissionRate } = calculateFinancials(totalAmount)

  // Calculate end time
  const [hours, minutes] = scheduledStartTime.split(':').map(Number)
  const endMinutes = hours * 60 + minutes + Math.round(service.duration_hours * 60)
  const endHour = Math.floor(endMinutes / 60)
  const endMin = endMinutes % 60
  const scheduledEndTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`

  const bookingNumber = generateBookingNumber()

  // Create booking
  const { data: rawBooking, error: bookingError } = await sb
    .from('bookings')
    .insert({
      booking_number: bookingNumber,
      customer_id: user.id,
      cleaner_id: cleanerId,
      service_id: serviceId,
      status: 'pending_payment',
      scheduled_date: scheduledDate,
      scheduled_start_time: scheduledStartTime,
      scheduled_end_time: scheduledEndTime,
      address,
      area_sqm: areaSqm || null,
      notes: notes || null,
      total_amount: totalAmount,
      platform_commission: platformCommission,
      cleaner_payout: cleanerPayout,
      commission_rate: commissionRate,
    })
    .select('id')
    .single()

  const booking = rawBooking as BookingRow | null

  if (bookingError || !booking) {
    console.error('Booking creation error:', bookingError)
    return NextResponse.json({ error: '預約建立失敗' }, { status: 500 })
  }

  // Create payment record
  await sb.from('payments').insert({
    booking_id: booking.id,
    ecpay_trade_no: bookingNumber,
    amount: totalAmount,
    status: 'pending',
  })

  // Log status
  await sb.from('booking_status_logs').insert({
    booking_id: booking.id,
    to_status: 'pending_payment',
    changed_by: user.id,
    notes: '訂單建立',
  })

  return NextResponse.json({ bookingId: booking.id, bookingNumber })
}
