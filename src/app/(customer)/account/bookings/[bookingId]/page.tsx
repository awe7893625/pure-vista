import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  pending_payment: '待付款', paid: '已付款', confirmed: '已確認',
  in_progress: '清潔中', completed: '已完成', customer_confirmed: '已驗收',
  cancelled: '已取消', disputed: '爭議中',
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { bookingId } = await params
  const { status: qsStatus } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  interface BookingDetail {
    id: string; booking_number: string; status: string; scheduled_date: string
    scheduled_start_time: string; address: string; notes: string | null
    total_amount: number; customer_id: string
    service: { title: string; duration_hours: number } | null
    cleaner: { display_name: string; avatar_url: string | null } | null
  }

  const { data: bookingRaw } = await supabase
    .from('bookings')
    .select(`
      *,
      service:services(title, duration_hours),
      cleaner:cleaners(display_name, avatar_url, profile:profiles(phone))
    `)
    .eq('id', bookingId)
    .eq('customer_id', user.id)
    .single()

  if (!bookingRaw) notFound()
  const booking = bookingRaw as unknown as BookingDetail

  const cleaner = booking.cleaner
  const service = booking.service

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/account/bookings" className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#1A1A1A] mb-6">
        ← 返回預約列表
      </Link>

      {/* Success Banner */}
      {qsStatus === 'success' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-emerald-800">付款成功！</p>
            <p className="text-sm text-emerald-700">清潔師已收到通知，請等待確認。</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E8EDE6] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#E8EDE6]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">訂單編號</p>
              <p className="font-mono text-sm text-[#1A1A1A]">{booking.booking_number}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              booking.status === 'customer_confirmed' ? 'text-emerald-600 bg-emerald-50' :
              booking.status === 'cancelled' ? 'text-red-600 bg-red-50' :
              'text-[#8FAD82] bg-[#8FAD82]/10'
            }`}>
              {STATUS_LABELS[booking.status]}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Cleaner */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#8FAD82]/10 flex items-center justify-center overflow-hidden">
              {cleaner?.avatar_url ? (
                <img src={cleaner.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#8FAD82] font-semibold">{cleaner?.display_name[0]}</span>
              )}
            </div>
            <div>
              <p className="font-medium text-[#1A1A1A]">{cleaner?.display_name}</p>
              <p className="text-sm text-[#9CA3AF]">清潔師</p>
            </div>
          </div>

          <div className="h-px bg-[#E8EDE6]" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[#9CA3AF] mb-1">服務項目</p>
              <p className="font-medium text-[#1A1A1A]">{service?.title}</p>
            </div>
            <div>
              <p className="text-[#9CA3AF] mb-1">服務時間</p>
              <p className="font-medium text-[#1A1A1A]">{service?.duration_hours} 小時</p>
            </div>
            <div>
              <p className="text-[#9CA3AF] mb-1">服務日期</p>
              <p className="font-medium text-[#1A1A1A]">{booking.scheduled_date}</p>
            </div>
            <div>
              <p className="text-[#9CA3AF] mb-1">開始時間</p>
              <p className="font-medium text-[#1A1A1A]">{booking.scheduled_start_time?.substring(0, 5)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[#9CA3AF] mb-1">服務地址</p>
              <p className="font-medium text-[#1A1A1A]">{booking.address}</p>
            </div>
            {booking.notes && (
              <div className="col-span-2">
                <p className="text-[#9CA3AF] mb-1">備註</p>
                <p className="text-[#1A1A1A]">{booking.notes}</p>
              </div>
            )}
          </div>

          <div className="h-px bg-[#E8EDE6]" />

          {/* Financials */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">服務費用</span>
              <span className="text-[#1A1A1A]">NT${booking.total_amount.toLocaleString('zh-TW')}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1">
              <span className="text-[#1A1A1A]">總計</span>
              <span className="text-[#8FAD82]">NT${booking.total_amount.toLocaleString('zh-TW')}</span>
            </div>
          </div>

          {/* Actions */}
          {booking.status === 'completed' && (
            <div className="pt-2">
              <button className="w-full py-3 bg-[#8FAD82] text-white rounded-xl font-medium hover:bg-[#6B8F5E] transition-colors">
                確認驗收完成
              </button>
              <p className="text-xs text-[#9CA3AF] text-center mt-2">確認後清潔師將在 14 天後收到款項</p>
            </div>
          )}

          {booking.status === 'pending_payment' && (
            <div className="pt-2">
              <Link
                href={`/book/${booking.id}/payment`}
                className="block text-center py-3 bg-[#8FAD82] text-white rounded-xl font-medium hover:bg-[#6B8F5E] transition-colors"
              >
                前往付款
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
