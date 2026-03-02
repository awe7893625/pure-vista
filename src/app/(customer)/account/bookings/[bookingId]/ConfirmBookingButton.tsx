'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConfirmBookingButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const router = useRouter()

  async function handleConfirm() {
    if (!window.confirm('確認服務已完成？確認後清潔師將在 14 天後收到款項，此操作不可撤銷。')) return
    setLoading(true)
    const res = await fetch(`/api/customer/bookings/${bookingId}/confirm`, { method: 'POST' })
    if (res.ok) {
      setConfirmed(true)
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error || '確認失敗，請稍後再試')
    }
    setLoading(false)
  }

  if (confirmed) {
    return (
      <div className="pt-2 text-center py-3 bg-emerald-50 rounded-xl">
        <p className="text-emerald-700 font-medium">✅ 已確認驗收完成</p>
        <p className="text-xs text-emerald-600 mt-1">款項將在 14 天後撥給清潔師</p>
      </div>
    )
  }

  return (
    <div className="pt-2">
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full py-3 bg-[#8FAD82] text-white rounded-xl font-medium hover:bg-[#6B8F5E] transition-colors disabled:opacity-50"
      >
        {loading ? '處理中...' : '確認驗收完成'}
      </button>
      <p className="text-xs text-[#9CA3AF] text-center mt-2">確認後清潔師將在 14 天後收到款項</p>
    </div>
  )
}
