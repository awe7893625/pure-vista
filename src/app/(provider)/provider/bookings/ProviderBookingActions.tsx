'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  bookingId: string
  status: string
}

export default function ProviderBookingActions({ bookingId, status }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function updateStatus(newStatus: string, notes?: string) {
    setLoading(newStatus)
    const res = await fetch(`/api/provider/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, notes }),
    })
    setLoading(null)
    if (res.ok) router.refresh()
  }

  if (status === 'paid') {
    return (
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => updateStatus('confirmed')}
          disabled={loading === 'confirmed'}
          className="px-4 py-2 bg-[#8FAD82] text-white rounded-xl text-sm font-medium hover:bg-[#6B8F5E] disabled:opacity-50 transition-colors"
        >
          {loading === 'confirmed' ? '處理中...' : '✅ 接受預約'}
        </button>
        <button
          onClick={() => updateStatus('cancelled', '清潔師取消')}
          disabled={loading === 'cancelled'}
          className="px-4 py-2 border border-red-300 text-red-600 rounded-xl text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {loading === 'cancelled' ? '處理中...' : '拒絕'}
        </button>
      </div>
    )
  }

  if (status === 'confirmed') {
    return (
      <button
        onClick={() => updateStatus('in_progress')}
        disabled={loading === 'in_progress'}
        className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {loading === 'in_progress' ? '處理中...' : '🚀 開始清潔'}
      </button>
    )
  }

  if (status === 'in_progress') {
    return (
      <button
        onClick={() => updateStatus('completed')}
        disabled={loading === 'completed'}
        className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
      >
        {loading === 'completed' ? '處理中...' : '✅ 清潔完成'}
      </button>
    )
  }

  return null
}
