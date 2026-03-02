import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user role to show appropriate nav items
  let userRole: string | null = null
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single()
    userRole = profile?.role || null
  }

  const isCleaner = userRole === 'cleaner'

  return (
    <div className="min-h-screen bg-[#F8F9F6]">
      {/* Navbar */}
      <nav className="bg-white border-b border-[#E8EDE6] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[#8FAD82] font-bold text-lg tracking-tight">澄境清潔</span>
            <span className="text-[#9CA3AF] text-xs hidden sm:inline">Pure Vista</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/cleaners" className="text-sm text-[#6B7280] hover:text-[#1A1A1A] transition-colors">
              尋找清潔師
            </Link>
            <Link href="/auth/register?role=cleaner" className="text-sm text-[#6B7280] hover:text-[#1A1A1A] transition-colors">
              成為清潔師
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {isCleaner ? (
                  <Link
                    href="/provider/dashboard"
                    className="text-sm px-4 py-2 bg-[#8FAD82] text-white rounded-xl hover:bg-[#6B8F5E] transition-colors"
                  >
                    清潔師後台
                  </Link>
                ) : (
                  <Link
                    href="/account/bookings"
                    className="text-sm text-[#6B7280] hover:text-[#1A1A1A] px-3 py-1.5 hidden sm:inline-flex"
                  >
                    我的預約
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm text-[#6B7280] hover:text-[#1A1A1A] px-3 py-1.5"
                >
                  登入
                </Link>
                <Link
                  href="/auth/register"
                  className="text-sm px-4 py-2 bg-[#8FAD82] text-white rounded-xl hover:bg-[#6B8F5E] transition-colors"
                >
                  註冊
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {children}

      {/* Footer */}
      <footer className="bg-white border-t border-[#E8EDE6] mt-16">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <p className="font-bold text-[#1A1A1A]">澄境清潔 Pure Vista</p>
              <p className="text-sm text-[#9CA3AF] mt-1">專業清潔服務媒合平台</p>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">服務</p>
                <div className="flex flex-col gap-1.5">
                  <Link href="/cleaners" className="text-sm text-[#9CA3AF] hover:text-[#1A1A1A]">尋找清潔師</Link>
                  <Link href="/auth/register?role=cleaner" className="text-sm text-[#9CA3AF] hover:text-[#1A1A1A]">成為清潔師</Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">帳號</p>
                <div className="flex flex-col gap-1.5">
                  <Link href="/auth/login" className="text-sm text-[#9CA3AF] hover:text-[#1A1A1A]">登入</Link>
                  <Link href="/account/bookings" className="text-sm text-[#9CA3AF] hover:text-[#1A1A1A]">我的預約</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-[#E8EDE6] mt-8 pt-6 text-center">
            <p className="text-xs text-[#9CA3AF]">© 2026 Pure Vista. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
