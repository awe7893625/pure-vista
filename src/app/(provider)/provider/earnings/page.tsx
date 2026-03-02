import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface CleanerRow {
  id: string
}

interface PayoutRow {
  id: string
  amount: number
  status: string
  transfer_ref: string | null
  booking: {
    booking_number: string
    scheduled_date: string
    service: { title: string } | null
  } | null
}

interface BookingEarningRow {
  cleaner_payout: number
  status: string
}

export default async function ProviderEarningsPage() {
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

  const { data: rawPayouts } = await supabase
    .from('payouts')
    .select('*, booking:bookings(booking_number, scheduled_date, service:services(title))')
    .eq('cleaner_id', cleaner.id)
    .order('created_at', { ascending: false })

  const payouts = rawPayouts as unknown as PayoutRow[] | null

  const { data: rawCompletedBookings } = await supabase
    .from('bookings')
    .select('cleaner_payout, status, customer_confirmed_at')
    .eq('cleaner_id', cleaner.id)
    .in('status', ['completed', 'customer_confirmed'])

  const completedBookings = rawCompletedBookings as unknown as BookingEarningRow[] | null

  const totalEarned = completedBookings?.filter(b => b.status === 'customer_confirmed')
    .reduce((sum, b) => sum + b.cleaner_payout, 0) || 0
  const pendingAmount = completedBookings?.filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + b.cleaner_payout, 0) || 0

  const PAYOUT_LABELS: Record<string, string> = {
    pending: '待撥款', processing: '處理中', completed: '已撥款', failed: '失敗',
  }
  const PAYOUT_COLORS: Record<string, string> = {
    pending: 'text-amber-600 bg-amber-50',
    processing: 'text-blue-600 bg-blue-50',
    completed: 'text-emerald-600 bg-emerald-50',
    failed: 'text-red-600 bg-red-50',
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-6">收入撥款</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-[#E8EDE6] p-5">
          <p className="text-xs text-[#9CA3AF] mb-2">已撥款總計</p>
          <p className="text-2xl font-bold text-emerald-600">NT${totalEarned.toLocaleString('zh-TW')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8EDE6] p-5">
          <p className="text-xs text-[#9CA3AF] mb-2">等待撥款中</p>
          <p className="text-2xl font-bold text-amber-600">NT${pendingAmount.toLocaleString('zh-TW')}</p>
        </div>
      </div>

      <p className="text-xs text-[#9CA3AF] mb-6 bg-white rounded-xl border border-[#E8EDE6] p-4">
        💡 撥款規則：客戶確認驗收後 14 天，平台人工轉帳至你的銀行帳戶（抽成 10%）。
      </p>

      {/* Payouts */}
      <div className="bg-white rounded-2xl border border-[#E8EDE6]">
        <div className="px-6 py-4 border-b border-[#E8EDE6]">
          <h2 className="font-semibold text-[#1A1A1A]">撥款紀錄</h2>
        </div>
        {!payouts || payouts.length === 0 ? (
          <div className="text-center py-12 text-[#9CA3AF]">
            <p>尚無撥款紀錄</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8EDE6]">
            {payouts.map((payout) => {
              const booking = payout.booking
              return (
                <div key={payout.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#1A1A1A] text-sm">
                      {booking?.service?.title || '清潔服務'}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">
                      #{booking?.booking_number} · {booking?.scheduled_date}
                    </p>
                    {payout.transfer_ref && (
                      <p className="text-xs text-[#6B7280] mt-0.5">轉帳帳號：{payout.transfer_ref}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#1A1A1A]">NT${payout.amount.toLocaleString('zh-TW')}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PAYOUT_COLORS[payout.status] || 'text-[#6B7280] bg-[#F8F9F6]'}`}>
                      {PAYOUT_LABELS[payout.status]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
