import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProviderBookingActions from './ProviderBookingActions'

const STATUS_LABELS: Record<string, string> = {
  pending_payment: '待付款', paid: '待確認', confirmed: '已確認',
  in_progress: '清潔中', completed: '已完成', customer_confirmed: '已驗收',
  cancelled: '已取消', disputed: '爭議中',
}

const STATUS_COLORS: Record<string, string> = {
  paid: 'text-blue-600 bg-blue-50',
  confirmed: 'text-green-600 bg-green-50',
  in_progress: 'text-purple-600 bg-purple-50',
  completed: 'text-teal-600 bg-teal-50',
  customer_confirmed: 'text-emerald-600 bg-emerald-50',
  cancelled: 'text-red-600 bg-red-50',
}

interface CleanerRow {
  id: string
}

interface BookingRow {
  id: string
  booking_number: string
  status: string
  scheduled_date: string
  scheduled_start_time: string
  total_amount: number
  cleaner_payout: number
  address: string
  notes: string | null
  customer: { full_name: string; phone?: string } | null
  service: { title: string; duration_hours: number } | null
}

export default async function ProviderBookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rawCleaner } = await supabase
    .from('cleaners')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  const cleaner = rawCleaner as unknown as CleanerRow | null

  if (!cleaner) redirect('/provider/onboarding')

  const { data: rawBookings } = await supabase
    .from('bookings')
    .select(`
      id, booking_number, status, scheduled_date, scheduled_start_time,
      total_amount, cleaner_payout, address, notes,
      customer:profiles(full_name, phone),
      service:services(title, duration_hours)
    `)
    .eq('cleaner_id', cleaner.id)
    .not('status', 'eq', 'pending_payment')
    .order('scheduled_date', { ascending: false })

  const bookings = rawBookings as unknown as BookingRow[] | null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">訂單管理</h1>
      </div>

      {!bookings || bookings.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF] bg-white rounded-2xl border border-[#E8EDE6]">
          <p className="text-4xl mb-3">📭</p>
          <p>目前沒有訂單</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const customer = booking.customer
            const service = booking.service

            return (
              <div key={booking.id} className="bg-white rounded-2xl border border-[#E8EDE6] p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">{service?.title}</p>
                    <p className="text-sm text-[#9CA3AF] mt-0.5">
                      #{booking.booking_number} · {customer?.full_name}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[booking.status] || 'text-[#6B7280] bg-[#F8F9F6]'}`}>
                    {STATUS_LABELS[booking.status]}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-[#9CA3AF] text-xs">日期</p>
                    <p className="text-[#1A1A1A]">{booking.scheduled_date}</p>
                  </div>
                  <div>
                    <p className="text-[#9CA3AF] text-xs">時間</p>
                    <p className="text-[#1A1A1A]">{booking.scheduled_start_time?.substring(0, 5)}</p>
                  </div>
                  <div>
                    <p className="text-[#9CA3AF] text-xs">時長</p>
                    <p className="text-[#1A1A1A]">{service?.duration_hours} 小時</p>
                  </div>
                  <div>
                    <p className="text-[#9CA3AF] text-xs">我的收入</p>
                    <p className="font-semibold text-[#8FAD82]">NT${booking.cleaner_payout.toLocaleString('zh-TW')}</p>
                  </div>
                </div>

                <div className="text-sm mb-4">
                  <p className="text-[#9CA3AF] text-xs">地址</p>
                  <p className="text-[#1A1A1A]">{booking.address}</p>
                </div>

                {booking.notes && (
                  <p className="text-sm text-[#6B7280] bg-[#F8F9F6] rounded-xl p-3 mb-4">
                    📝 {booking.notes}
                  </p>
                )}

                <ProviderBookingActions bookingId={booking.id} status={booking.status} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
