'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPayoutActions({ payoutId, isEligible }: { payoutId: string; isEligible: boolean }) {
  const [showInput, setShowInput] = useState(false)
  const [transferRef, setTransferRef] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function confirmPayout() {
    if (!transferRef.trim()) return
    setLoading(true)
    await fetch(`/api/admin/payouts/${payoutId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', transferRef }),
    })
    setLoading(false)
    router.refresh()
  }

  if (!isEligible) {
    return <p className="text-xs text-[#9CA3AF] mt-1">未到撥款日</p>
  }

  if (showInput) {
    return (
      <div className="mt-2 flex gap-2">
        <input
          value={transferRef}
          onChange={(e) => setTransferRef(e.target.value)}
          placeholder="轉帳末5碼"
          className="w-28 px-2 py-1.5 border border-[#E8EDE6] rounded-lg text-xs text-[#1A1A1A]"
        />
        <button
          onClick={confirmPayout}
          disabled={loading || !transferRef.trim()}
          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs disabled:opacity-50"
        >
          {loading ? '...' : '確認'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowInput(true)}
      className="mt-2 px-3 py-1.5 bg-[#8FAD82] text-white rounded-lg text-xs hover:bg-[#6B8F5E]"
    >
      確認撥款
    </button>
  )
}
