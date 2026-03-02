import { createClient } from '@/lib/supabase/server'

interface RecentBookingRow {
  id: string; booking_number: string; status: string; total_amount: number
  platform_commission: number; created_at: string
  customer: { full_name: string } | null
  service: { title: string } | null
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: totalCleaners },
    { count: pendingCleaners },
    { count: totalBookings },
    { data: recentBookingsRaw },
    { data: completedBookingsRaw },
  ] = await Promise.all([
    supabase.from('cleaners').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('cleaners').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).not('status', 'in', '("pending_payment","cancelled")'),
    supabase.from('bookings')
      .select('id, booking_number, status, total_amount, platform_commission, created_at, customer:profiles(full_name), service:services(title)')
      .not('status', 'in', '("pending_payment")')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('bookings')
      .select('platform_commission')
      .in('status', ['customer_confirmed']),
  ])

  const recentBookings = recentBookingsRaw as unknown as RecentBookingRow[]
  const completedBookings = completedBookingsRaw as { platform_commission: number }[] | null
  const totalRevenue = completedBookings?.reduce((sum, b) => sum + b.platform_commission, 0) || 0

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-6">管理儀表板</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: '已核准清潔師', value: totalCleaners || 0, unit: '位', color: 'text-[#8FAD82]' },
          { label: '待審核申請', value: pendingCleaners || 0, unit: '件', color: 'text-amber-600',
            alert: (pendingCleaners || 0) > 0 },
          { label: '訂單總數', value: totalBookings || 0, unit: '筆', color: 'text-blue-600' },
          { label: '平台收入', value: `NT$${totalRevenue.toLocaleString('zh-TW')}`, unit: '', color: 'text-emerald-600' },
        ].map((stat) => (
          <div key={stat.label} className={`bg-white rounded-2xl border p-5 ${stat.alert ? 'border-amber-300' : 'border-[#E8EDE6]'}`}>
            <p className="text-xs text-[#9CA3AF] mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
              {stat.unit && <span className="text-sm font-normal text-[#9CA3AF] ml-1">{stat.unit}</span>}
            </p>
            {stat.alert && (
              <p className="text-xs text-amber-600 mt-1">⚠️ 需要處理</p>
            )}
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl border border-[#E8EDE6]">
        <div className="px-6 py-4 border-b border-[#E8EDE6] flex items-center justify-between">
          <h2 className="font-semibold text-[#1A1A1A]">最近訂單</h2>
          <a href="/admin/bookings" className="text-xs text-[#8FAD82] hover:underline">查看全部</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8EDE6]">
                <th className="text-left px-6 py-3 text-xs text-[#9CA3AF] font-medium">訂單編號</th>
                <th className="text-left px-6 py-3 text-xs text-[#9CA3AF] font-medium">服務</th>
                <th className="text-left px-6 py-3 text-xs text-[#9CA3AF] font-medium">客戶</th>
                <th className="text-left px-6 py-3 text-xs text-[#9CA3AF] font-medium">金額</th>
                <th className="text-left px-6 py-3 text-xs text-[#9CA3AF] font-medium">抽成</th>
                <th className="text-left px-6 py-3 text-xs text-[#9CA3AF] font-medium">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDE6]">
              {recentBookings?.map((booking) => {
                const customer = booking.customer
                const service = booking.service
                return (
                  <tr key={booking.id} className="hover:bg-[#F8F9F6]">
                    <td className="px-6 py-3 font-mono text-xs text-[#6B7280]">{booking.booking_number}</td>
                    <td className="px-6 py-3 text-[#1A1A1A]">{service?.title}</td>
                    <td className="px-6 py-3 text-[#6B7280]">{customer?.full_name}</td>
                    <td className="px-6 py-3 font-medium text-[#1A1A1A]">NT${booking.total_amount.toLocaleString('zh-TW')}</td>
                    <td className="px-6 py-3 text-[#8FAD82]">NT${booking.platform_commission.toLocaleString('zh-TW')}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-[#F8F9F6] text-[#6B7280]">
                        {booking.status}
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
