'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCancel() {
    if (!window.confirm('確定要取消此預約？如已付款，退款將由客服在 5-7 個工作天內處理。')) return
    setLoading(true)
    const res = await fetch(`/api/customer/bookings/${bookingId}/cancel`, { method: 'POST' })
    setLoading(false)
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error || '取消失敗，請稍後再試')
    }
  }

  return (
    <div className="pt-2">
      <button
        onClick={handleCancel}
        disabled={loading}
        className="w-full py-3 border border-red-300 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {loading ? '處理中...' : '取消預約'}
      </button>
      <p className="text-xs text-[#9CA3AF] text-center mt-2">
        取消後退款將於 5-7 個工作天內退回原支付方式
      </p>
    </div>
  )
}
