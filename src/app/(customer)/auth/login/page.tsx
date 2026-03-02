'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials' ? '帳號或密碼錯誤' : error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">歡迎回來</h1>
          <p className="text-[#9CA3AF] mt-1.5 text-sm">登入澄境清潔帳號</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EDE6] p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] focus:border-transparent text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] focus:border-transparent text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#8FAD82] text-white rounded-xl font-medium hover:bg-[#6B8F5E] transition-colors disabled:opacity-50"
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-[#9CA3AF]">
            還沒有帳號？{' '}
            <Link href="/auth/register" className="text-[#8FAD82] hover:underline font-medium">
              立即註冊
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
