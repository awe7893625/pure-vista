'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  cleanerId: string
  currentStatus: string
}

export default function AdminCleanerActions({ cleanerId, currentStatus }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function updateStatus(status: string) {
    setLoading(status)
    await fetch(`/api/admin/cleaners/${cleanerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex gap-2 flex-shrink-0">
      {currentStatus === 'pending' && (
        <>
          <button
            onClick={() => updateStatus('approved')}
            disabled={loading === 'approved'}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading === 'approved' ? '...' : '✅ 核准'}
          </button>
          <button
            onClick={() => updateStatus('suspended')}
            disabled={loading === 'suspended'}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-xl text-sm hover:bg-red-50 disabled:opacity-50"
          >
            {loading === 'suspended' ? '...' : '拒絕'}
          </button>
        </>
      )}
      {currentStatus === 'approved' && (
        <button
          onClick={() => updateStatus('suspended')}
          disabled={loading === 'suspended'}
          className="px-4 py-2 border border-red-300 text-red-600 rounded-xl text-sm hover:bg-red-50 disabled:opacity-50"
        >
          {loading === 'suspended' ? '...' : '停用'}
        </button>
      )}
      {currentStatus === 'suspended' && (
        <button
          onClick={() => updateStatus('approved')}
          disabled={loading === 'approved'}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading === 'approved' ? '...' : '重新啟用'}
        </button>
      )}
    </div>
  )
}
