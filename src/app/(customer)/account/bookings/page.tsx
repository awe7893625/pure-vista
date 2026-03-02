import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  pending_payment: '待付款',
  paid: '已付款',
  confirmed: '已確認',
  in_progress: '清潔中',
  completed: '已完成',
  customer_confirmed: '已驗收',
  cancelled: '已取消',
  disputed: '爭議中',
}

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'text-amber-600 bg-amber-50',
  paid: 'text-blue-600 bg-blue-50',
  confirmed: 'text-green-600 bg-green-50',
  in_progress: 'text-purple-600 bg-purple-50',
  completed: 'text-teal-600 bg-teal-50',
  customer_confirmed: 'text-emerald-600 bg-emerald-50',
  cancelled: 'text-red-600 bg-red-50',
  disputed: 'text-orange-600 bg-orange-50',
}

interface BookingRow {
  id: string
  status: string
  scheduled_date: string
  scheduled_start_time: string
  total_amount: number
  cleaner: { display_name: string; avatar_url?: string } | null
  service: { title: string } | null
}

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rawBookings } = await supabase
    .from('bookings')
    .select('*, service:services(title), cleaner:cleaners(display_name, avatar_url)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  const bookings = rawBookings as unknown as BookingRow[] | null

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-6">我的預約</h1>

      {!bookings || bookings.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <p className="text-4xl mb-4">📋</p>
          <p className="mb-6">還沒有預約紀錄</p>
          <Link
            href="/cleaners"
            className="inline-flex px-6 py-2.5 bg-[#8FAD82] text-white rounded-xl text-sm hover:bg-[#6B8F5E] transition-colors"
          >
            尋找清潔師
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const cleaner = booking.cleaner
            const service = booking.service

            return (
              <Link key={booking.id} href={`/account/bookings/${booking.id}`}>
                <div className="bg-white rounded-2xl border border-[#E8EDE6] hover:shadow-sm transition-all p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#8FAD82]/10 flex items-center justify-center flex-shrink-0">
                        {cleaner?.avatar_url ? (
                          <img src={cleaner.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="text-[#8FAD82] text-sm font-semibold">
                            {cleaner?.display_name[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A] text-sm">{service?.title}</p>
                        <p className="text-xs text-[#9CA3AF]">{cleaner?.display_name}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[booking.status] || 'text-[#6B7280] bg-[#F8F9F6]'}`}>
                      {STATUS_LABELS[booking.status] || booking.status}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <div className="flex gap-4 text-[#6B7280]">
                      <span>📅 {booking.scheduled_date}</span>
                      <span>🕐 {booking.scheduled_start_time?.substring(0, 5)}</span>
                    </div>
                    <span className="font-semibold text-[#1A1A1A]">
                      NT${booking.total_amount.toLocaleString('zh-TW')}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
