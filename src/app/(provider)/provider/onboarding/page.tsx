'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [form, setForm] = useState({
    displayName: '', bio: '', city: '台北', district: '',
    bankCode: '', bankAccount: '', bankAccountName: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Update profile role to cleaner
    await sb
      .from('profiles')
      .update({ role: 'cleaner' })
      .eq('id', user.id)

    // Create cleaner record
    const { error: cleanerError } = await sb
      .from('cleaners')
      .insert({
        profile_id: user.id,
        display_name: form.displayName,
        bio: form.bio,
        city: form.city,
        district: form.district,
        bank_code: form.bankCode || null,
        bank_account: form.bankAccount || null,
        bank_account_name: form.bankAccountName || null,
        status: 'pending',
      })

    if (cleanerError) {
      setError('建立清潔師資料失敗：' + cleanerError.message)
      setLoading(false)
      return
    }

    router.push('/provider/dashboard')
    router.refresh()
  }

  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-2">完成清潔師資料</h1>
      <p className="text-[#9CA3AF] text-sm mb-8">填寫後等待平台審核，審核通過即可接單</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#E8EDE6] p-6 space-y-4">
          <h2 className="font-medium text-[#1A1A1A]">基本資料</h2>
          <div>
            <label className="block text-sm text-[#6B7280] mb-1.5">顯示名稱 *</label>
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="將顯示在平台上的名稱"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
            />
          </div>
          <div>
            <label className="block text-sm text-[#6B7280] mb-1.5">自我介紹</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="介紹你的清潔經驗、專長..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] text-[#1A1A1A] placeholder-[#9CA3AF] bg-white resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#6B7280] mb-1.5">城市 *</label>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] text-[#1A1A1A] bg-white"
              >
                {['台北', '新北', '桃園', '台中', '台南', '高雄'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1.5">區域</label>
              <input
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                placeholder="信義區"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EDE6] p-6 space-y-4">
          <h2 className="font-medium text-[#1A1A1A]">銀行帳戶（用於撥款）</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#6B7280] mb-1.5">銀行代碼</label>
              <input
                value={form.bankCode}
                onChange={(e) => setForm({ ...form, bankCode: e.target.value })}
                placeholder="008"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
              />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1.5">帳號</label>
              <input
                value={form.bankAccount}
                onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                placeholder="帳號號碼"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#6B7280] mb-1.5">戶名</label>
            <input
              value={form.bankAccountName}
              onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
              placeholder="真實姓名"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
            />
          </div>
          <p className="text-xs text-[#9CA3AF]">銀行資料將用於清潔完成後的撥款，可稍後補填</p>
        </div>

        {error && <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-[#8FAD82] text-white rounded-xl font-medium hover:bg-[#6B8F5E] transition-colors disabled:opacity-50"
        >
          {loading ? '提交中...' : '提交審核申請'}
        </button>

        <p className="text-center text-xs text-[#9CA3AF]">
          提交後平台將在 1-3 個工作天內完成審核
        </p>
      </form>
    </div>
  )
}
