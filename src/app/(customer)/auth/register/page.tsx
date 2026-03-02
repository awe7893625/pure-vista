'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function RegisterForm() {
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', phone: '', role: 'customer',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get('role') || 'customer'

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, phone: form.phone, role: defaultRole }
      }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Insert profile — cast needed because Database Relationships are not defined for join inference
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('profiles').insert({
        id: data.user.id,
        email: form.email,
        full_name: form.fullName,
        phone: form.phone,
        role: defaultRole as 'customer' | 'cleaner' | 'admin',
      })

      if (defaultRole === 'cleaner') {
        router.push('/provider/onboarding')
      } else {
        router.push('/')
      }
      router.refresh()
    }
  }

  const isCleaner = defaultRole === 'cleaner'

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">
            {isCleaner ? '成為清潔師' : '建立帳號'}
          </h1>
          <p className="text-[#9CA3AF] mt-1.5 text-sm">
            {isCleaner ? '開始接單，自由排班' : '開始尋找專業清潔師'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EDE6] p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">姓名</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="王小明"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] focus:border-transparent text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] focus:border-transparent text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">手機號碼</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="09xxxxxxxx"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] focus:border-transparent text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">密碼</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="至少 8 個字元"
                required
                minLength={8}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] focus:border-transparent text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#8FAD82] text-white rounded-xl font-medium hover:bg-[#6B8F5E] transition-colors disabled:opacity-50"
            >
              {loading ? '建立中...' : '建立帳號'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-[#9CA3AF]">
            已有帳號？{' '}
            <Link href="/auth/login" className="text-[#8FAD82] hover:underline font-medium">
              直接登入
            </Link>
          </div>
        </div>

        {!isCleaner && (
          <p className="text-center text-sm text-[#9CA3AF] mt-4">
            想要接案？{' '}
            <Link href="/auth/register?role=cleaner" className="text-[#8FAD82] hover:underline">
              以清潔師身份註冊
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
