import { createClient } from '@/lib/supabase/server'

const STATUS_LABELS: Record<string, string> = {
  pending_payment: '待付款', paid: '已付款', confirmed: '已確認',
  in_progress: '清潔中', completed: '已完成', customer_confirmed: '已驗收',
  cancelled: '已取消', disputed: '爭議中',
}

export default async function AdminBookingsPage() {
  const supabase = await createClient()

  interface BookingRow {
    id: string; booking_number: string; status: string; scheduled_date: string
    total_amount: number; platform_commission: number; created_at: string; address: string
    customer: { full_name: string; email: string } | null
    cleaner: { display_name: string } | null
    service: { title: string } | null
  }

  const { data: bookingsRaw } = await supabase
    .from('bookings')
    .select(`
      id, booking_number, status, scheduled_date, total_amount, platform_commission,
      created_at, address,
      customer:profiles(full_name, email),
      cleaner:cleaners(display_name),
      service:services(title)
    `)
    .order('created_at', { ascending: false })
    .limit(50)
  const bookings = bookingsRaw as unknown as BookingRow[]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-6">訂單管理</h1>

      <div className="bg-white rounded-2xl border border-[#E8EDE6] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8EDE6] bg-[#F8F9F6]">
                <th className="text-left px-5 py-3 text-xs text-[#9CA3AF] font-medium">訂單</th>
                <th className="text-left px-5 py-3 text-xs text-[#9CA3AF] font-medium">服務</th>
                <th className="text-left px-5 py-3 text-xs text-[#9CA3AF] font-medium">客戶</th>
                <th className="text-left px-5 py-3 text-xs text-[#9CA3AF] font-medium">清潔師</th>
                <th className="text-left px-5 py-3 text-xs text-[#9CA3AF] font-medium">日期</th>
                <th className="text-right px-5 py-3 text-xs text-[#9CA3AF] font-medium">金額/抽成</th>
                <th className="text-left px-5 py-3 text-xs text-[#9CA3AF] font-medium">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDE6]">
              {bookings?.map((booking) => {
                const customer = booking.customer
                const cleaner = booking.cleaner
                const service = booking.service

                return (
                  <tr key={booking.id} className="hover:bg-[#F8F9F6]">
                    <td className="px-5 py-3 font-mono text-xs text-[#6B7280]">{booking.booking_number}</td>
                    <td className="px-5 py-3 text-[#1A1A1A]">{service?.title}</td>
                    <td className="px-5 py-3 text-[#6B7280]">{customer?.full_name}</td>
                    <td className="px-5 py-3 text-[#6B7280]">{cleaner?.display_name}</td>
                    <td className="px-5 py-3 text-[#6B7280]">{booking.scheduled_date}</td>
                    <td className="px-5 py-3 text-right">
                      <div>
                        <span className="text-[#1A1A1A] font-medium">NT${booking.total_amount.toLocaleString('zh-TW')}</span>
                        <span className="text-xs text-[#8FAD82] ml-1">(+{booking.platform_commission})</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        booking.status === 'cancelled' ? 'text-red-600 bg-red-50' :
                        booking.status === 'customer_confirmed' ? 'text-emerald-600 bg-emerald-50' :
                        booking.status === 'disputed' ? 'text-orange-600 bg-orange-50' :
                        'text-[#6B7280] bg-[#F8F9F6]'
                      }`}>
                        {STATUS_LABELS[booking.status]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
