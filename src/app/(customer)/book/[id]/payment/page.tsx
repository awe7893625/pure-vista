import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { buildECPayForm } from '@/lib/ecpay'

interface BookingRow {
  id: string
  booking_number: string
  status: string
  total_amount: number
  service: { title: string } | null
}

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const bookingId = (await params).id
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rawBooking } = await supabase
    .from('bookings')
    .select('*, service:services(title), cleaner:cleaners(display_name)')
    .eq('id', bookingId)
    .eq('customer_id', user.id)
    .single()

  const booking = rawBooking as unknown as BookingRow | null

  if (!booking) notFound()
  if (booking.status !== 'pending_payment') {
    redirect(`/account/bookings/${bookingId}`)
  }

  // Build ECPay auto-submit form
  const ecpayHtml = buildECPayForm({
    bookingId: booking.id,
    bookingNumber: booking.booking_number,
    totalAmount: booking.total_amount,
    serviceTitle: `澄境清潔 - ${booking.service?.title || '清潔服務'}`,
  })

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="animate-spin w-10 h-10 border-2 border-[#8FAD82] border-t-transparent rounded-full mx-auto mb-6" />
      <h1 className="text-xl font-semibold text-[#1A1A1A] mb-2">正在前往付款頁面</h1>
      <p className="text-[#9CA3AF] text-sm mb-6">
        訂單編號：{booking.booking_number}<br />
        金額：NT${booking.total_amount.toLocaleString('zh-TW')}
      </p>
      <p className="text-xs text-[#9CA3AF]">請稍候，系統自動轉跳至 ECPay 付款頁面...</p>

      {/* Inject ECPay auto-submit form */}
      <div dangerouslySetInnerHTML={{ __html: ecpayHtml }} />
    </div>
  )
}
