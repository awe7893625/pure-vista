import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const STATUS_LABELS: Record<string, string> = {
  pending_payment: '待付款', paid: '已付款', confirmed: '已確認',
  in_progress: '清潔中', completed: '已完成', customer_confirmed: '已驗收',
  cancelled: '已取消', disputed: '爭議中',
}

interface CleanerRow {
  id: string
  display_name: string
  status: string
  total_bookings: number
  average_rating: number
  total_reviews: number
}

interface TodayBookingRow {
  id: string
  booking_number: string
  status: string
  scheduled_start_time: string
  total_amount: number
  customer: { full_name: string } | null
  service: { title: string } | null
}

interface MonthBookingRow {
  cleaner_payout: number
}

interface PendingBookingRow {
  id: string
}

export default async function ProviderDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rawCleaner } = await supabase
    .from('cleaners')
    .select('id, display_name, status, total_bookings, average_rating, total_reviews')
    .eq('profile_id', user.id)
    .single()

  const cleaner = rawCleaner as unknown as CleanerRow | null

  if (!cleaner) redirect('/provider/onboarding')

  // Today's bookings
  const today = new Date().toISOString().split('T')[0]
  const { data: rawTodayBookings } = await supabase
    .from('bookings')
    .select('id, booking_number, status, scheduled_start_time, total_amount, customer:profiles(full_name), service:services(title)')
    .eq('cleaner_id', cleaner.id)
    .eq('scheduled_date', today)
    .not('status', 'in', '("cancelled","disputed")')
    .order('scheduled_start_time')

  const todayBookings = rawTodayBookings as unknown as TodayBookingRow[] | null

  // This month earnings
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: rawMonthBookings } = await supabase
    .from('bookings')
    .select('cleaner_payout')
    .eq('cleaner_id', cleaner.id)
    .in('status', ['completed', 'customer_confirmed'])
    .gte('completed_at', monthStart.toISOString())

  const monthBookings = rawMonthBookings as unknown as MonthBookingRow[] | null

  const monthEarnings = monthBookings?.reduce((sum, b) => sum + b.cleaner_payout, 0) || 0

  // Pending actions
  const { data: rawPendingBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('cleaner_id', cleaner.id)
    .eq('status', 'paid')

  const pendingBookings = rawPendingBookings as unknown as PendingBookingRow[] | null

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">
          早安，{cleaner.display_name} 👋
        </h1>
        <p className="text-[#9CA3AF] text-sm mt-1">今天是 {today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: '今日訂單', value: todayBookings?.length || 0, unit: '筆', color: 'text-[#8FAD82]' },
          { label: '本月收入', value: `NT$${monthEarnings.toLocaleString('zh-TW')}`, unit: '', color: 'text-emerald-600' },
          { label: '累積評分', value: cleaner.average_rating > 0 ? Number(cleaner.average_rating).toFixed(1) : '新', unit: `★ (${cleaner.total_reviews}則)`, color: 'text-amber-500' },
          { label: '待確認', value: pendingBookings?.length || 0, unit: '筆', color: 'text-blue-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-[#E8EDE6] p-5">
            <p className="text-xs text-[#9CA3AF] mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
              {stat.unit && <span className="text-sm font-normal text-[#9CA3AF] ml-1">{stat.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Today's schedule */}
      <div className="bg-white rounded-2xl border border-[#E8EDE6]">
        <div className="px-6 py-4 border-b border-[#E8EDE6] flex items-center justify-between">
          <h2 className="font-semibold text-[#1A1A1A]">今日行程</h2>
          <a href="/provider/bookings" className="text-xs text-[#8FAD82] hover:underline">查看全部</a>
        </div>
        <div className="p-6">
          {!todayBookings || todayBookings.length === 0 ? (
            <div className="text-center py-8 text-[#9CA3AF]">
              <p className="text-3xl mb-2">😌</p>
              <p className="text-sm">今天沒有預約</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBookings.map((booking) => {
                const customer = booking.customer
                const service = booking.service
                return (
                  <div key={booking.id} className="flex items-center justify-between p-4 rounded-xl bg-[#F8F9F6]">
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[50px]">
                        <p className="text-sm font-bold text-[#8FAD82]">
                          {booking.scheduled_start_time?.substring(0, 5)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A] text-sm">{service?.title}</p>
                        <p className="text-xs text-[#9CA3AF]">{customer?.full_name}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white border border-[#E8EDE6] text-[#6B7280]">
                      {STATUS_LABELS[booking.status]}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
