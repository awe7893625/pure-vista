import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface AvailabilityRule {
  day_of_week: string
  start_time: string
  end_time: string
  is_active: boolean
}

interface AvailabilityException {
  exception_date: string
  is_blocked: boolean
}

interface BookedRange {
  start: string
  end: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a Date as "YYYY-MM-DD" using local time components */
function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Trim HH:MM:SS → HH:MM */
function trimTime(t: string): string {
  return t.length > 5 ? t.substring(0, 5) : t
}

// ─── Mode A: ?month=YYYY-MM ───────────────────────────────────────────────────

async function handleMonthQuery(
  cleanerId: string,
  month: string
): Promise<NextResponse> {
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1 // 0-based for Date

  if (
    !year ||
    isNaN(year) ||
    isNaN(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // 1. All active availability rules for this cleaner
  const { data: rulesData, error: rulesError } = await sb
    .from('availability_rules')
    .select('day_of_week, start_time, end_time, is_active')
    .eq('cleaner_id', cleanerId)
    .eq('is_active', true)

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 })
  }

  const rules: AvailabilityRule[] = rulesData ?? []
  // Build a Set of active day_of_week values (as numbers) for O(1) lookup
  const activeDays = new Set(rules.map((r) => Number(r.day_of_week)))

  // 2. All blocked exceptions in the month
  const firstDay = `${yearStr}-${monthStr}-01`
  const lastDate = new Date(year, monthIndex + 1, 0) // last day of month
  const lastDay = toDateString(lastDate)

  const { data: exceptionsData, error: exceptionsError } = await sb
    .from('availability_exceptions')
    .select('exception_date, is_blocked')
    .eq('cleaner_id', cleanerId)
    .eq('is_blocked', true)
    .gte('exception_date', firstDay)
    .lte('exception_date', lastDay)

  if (exceptionsError) {
    return NextResponse.json({ error: exceptionsError.message }, { status: 500 })
  }

  const exceptions: AvailabilityException[] = exceptionsData ?? []
  const blockedDates = new Set(exceptions.map((e) => e.exception_date))

  // 3. Build response — "tomorrow" is the earliest bookable day
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const days: Record<string, { hasRule: boolean; isBlocked: boolean; isPast: boolean }> = {}
  const totalDays = lastDate.getDate()

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, monthIndex, day)
    const dateStr = toDateString(date)
    const dayOfWeek = date.getDay() // 0=Sun..6=Sat (matches DB convention)

    days[dateStr] = {
      hasRule: activeDays.has(dayOfWeek),
      isBlocked: blockedDates.has(dateStr),
      isPast: date < tomorrow,
    }
  }

  return NextResponse.json({ days })
}

// ─── Mode B: ?date=YYYY-MM-DD ────────────────────────────────────────────────

async function handleDateQuery(
  cleanerId: string,
  date: string
): Promise<NextResponse> {
  const parsed = new Date(date + 'T00:00:00') // local midnight
  if (isNaN(parsed.getTime())) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 })
  }

  const dayOfWeek = parsed.getDay() // 0=Sun..6=Sat

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // 1. Availability rule for this day_of_week
  const { data: ruleData, error: ruleError } = await sb
    .from('availability_rules')
    .select('start_time, end_time')
    .eq('cleaner_id', cleanerId)
    .eq('day_of_week', String(dayOfWeek))
    .eq('is_active', true)
    .maybeSingle()

  if (ruleError) {
    return NextResponse.json({ error: ruleError.message }, { status: 500 })
  }

  const rule: { start_time: string; end_time: string } | null = ruleData
    ? { start_time: ruleData.start_time, end_time: ruleData.end_time }
    : null

  // 2. Exception for this specific date
  const { data: exceptionData, error: exceptionError } = await sb
    .from('availability_exceptions')
    .select('is_blocked')
    .eq('cleaner_id', cleanerId)
    .eq('exception_date', date)
    .maybeSingle()

  if (exceptionError) {
    return NextResponse.json({ error: exceptionError.message }, { status: 500 })
  }

  const isBlocked: boolean = exceptionData?.is_blocked === true

  // 3. Existing bookings on this date with active statuses
  const { data: bookingsData, error: bookingsError } = await sb
    .from('bookings')
    .select('scheduled_start_time, scheduled_end_time')
    .eq('cleaner_id', cleanerId)
    .eq('scheduled_date', date)
    .in('status', ['paid', 'confirmed', 'in_progress'])

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 })
  }

  const bookedRanges: BookedRange[] = ((bookingsData ?? []) as {
    scheduled_start_time: string
    scheduled_end_time: string
  }[]).map((b) => ({
    start: trimTime(b.scheduled_start_time),
    end: trimTime(b.scheduled_end_time),
  }))

  return NextResponse.json({
    date,
    rule,
    isBlocked,
    bookedRanges,
  })
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cleanerId: string }> }
): Promise<NextResponse> {
  const { cleanerId } = await params
  const { searchParams } = new URL(request.url)

  const month = searchParams.get('month')
  const date = searchParams.get('date')

  if (month) {
    return handleMonthQuery(cleanerId, month)
  }

  if (date) {
    return handleDateQuery(cleanerId, date)
  }

  return NextResponse.json(
    { error: 'Provide either ?month=YYYY-MM or ?date=YYYY-MM-DD' },
    { status: 400 }
  )
}
