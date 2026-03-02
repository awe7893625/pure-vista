import { createClient } from '@/lib/supabase/server'
import AdminPayoutActions from './AdminPayoutActions'

interface PayoutRow {
  id: string; amount: number; status: string; eligible_at: string
  transfer_ref: string | null; notes: string | null; created_at: string
  cleaner: { display_name: string; bank_code: string | null; bank_account: string | null; bank_account_name: string | null } | null
  booking: { booking_number: string; scheduled_date: string; service: { title: string } | null } | null
}

export default async function AdminPayoutsPage() {
  const supabase = await createClient()

  const { data: payoutsRaw } = await supabase
    .from('payouts')
    .select(`
      id, amount, status, eligible_at, transfer_ref, notes, created_at,
      cleaner:cleaners(display_name, bank_code, bank_account, bank_account_name),
      booking:bookings(booking_number, scheduled_date, service:services(title))
    `)
    .order('eligible_at', { ascending: true })
  const payouts = payoutsRaw as unknown as PayoutRow[]

  const pendingPayouts = payouts?.filter(p => p.status === 'pending') || []
  const pendingTotal = pendingPayouts.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">撥款管理</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            待撥款：{pendingPayouts.length} 筆 · NT${pendingTotal.toLocaleString('zh-TW')}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {!payouts || payouts.length === 0 ? (
          <div className="text-center py-12 text-[#9CA3AF] bg-white rounded-2xl border border-[#E8EDE6]">
            目前無撥款紀錄
          </div>
        ) : payouts.map((payout) => {
          const cleaner = payout.cleaner
          const booking = payout.booking
          const isEligible = new Date(payout.eligible_at) <= new Date()

          return (
            <div key={payout.id} className={`bg-white rounded-2xl border p-5 ${
              payout.status === 'pending' && isEligible ? 'border-amber-300' : 'border-[#E8EDE6]'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[#1A1A1A]">{cleaner?.display_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      payout.status === 'completed' ? 'text-emerald-600 bg-emerald-50' :
                      payout.status === 'pending' ? 'text-amber-600 bg-amber-50' :
                      'text-[#6B7280] bg-[#F8F9F6]'
                    }`}>
                      {payout.status === 'completed' ? '已撥款' : payout.status === 'pending' ? '待撥款' : payout.status}
                    </span>
                  </div>
                  <p className="text-sm text-[#6B7280]">{booking?.service?.title} · #{booking?.booking_number}</p>
                  <div className="mt-2 text-xs text-[#9CA3AF] space-y-0.5">
                    {cleaner?.bank_account && (
                      <p>銀行：{cleaner.bank_code} · {cleaner.bank_account} ({cleaner.bank_account_name})</p>
                    )}
                    <p>可撥款日：{new Date(payout.eligible_at).toLocaleDateString('zh-TW')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-[#1A1A1A]">NT${payout.amount.toLocaleString('zh-TW')}</p>
                  {payout.status === 'pending' && (
                    <AdminPayoutActions payoutId={payout.id} isEligible={isEligible} />
                  )}
                  {payout.transfer_ref && (
                    <p className="text-xs text-[#9CA3AF] mt-1">Ref: {payout.transfer_ref}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
