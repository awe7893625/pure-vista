import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface CleanerRow {
  id: string
  display_name: string
  status: string
}

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rawCleaner } = await supabase
    .from('cleaners')
    .select('id, display_name, status')
    .eq('profile_id', user.id)
    .single()

  const cleaner = rawCleaner as unknown as CleanerRow | null

  const navItems = [
    { href: '/provider/dashboard', label: '儀表板', icon: '📊' },
    { href: '/provider/bookings', label: '訂單管理', icon: '📋' },
    { href: '/provider/services', label: '服務項目', icon: '✨' },
    { href: '/provider/availability', label: '可接單時段', icon: '📅' },
    { href: '/provider/earnings', label: '收入撥款', icon: '💰' },
    { href: '/provider/documents', label: '驗證文件', icon: '📄' },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9F6] flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-[#E8EDE6] flex flex-col fixed left-0 top-0 h-full">
        <div className="p-5 border-b border-[#E8EDE6]">
          <Link href="/" className="block">
            <p className="font-bold text-[#8FAD82] text-sm">澄境清潔</p>
            <p className="text-xs text-[#9CA3AF]">清潔師後台</p>
          </Link>
        </div>

        {cleaner && (
          <div className="px-4 py-3 border-b border-[#E8EDE6]">
            <p className="text-xs font-medium text-[#1A1A1A] truncate">{cleaner.display_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              cleaner.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
              cleaner.status === 'pending' ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'
            }`}>
              {cleaner.status === 'approved' ? '✅ 已審核' :
               cleaner.status === 'pending' ? '⏳ 審核中' : '⛔ 已停用'}
            </span>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F8F9F6] transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#E8EDE6]">
          <Link href="/" className="text-xs text-[#9CA3AF] hover:text-[#6B7280]">← 返回前台</Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-56 p-8">
        {!cleaner ? (
          <div className="max-w-md mx-auto text-center py-20">
            <p className="text-4xl mb-4">👋</p>
            <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">歡迎加入澄境清潔！</h2>
            <p className="text-[#6B7280] mb-6">請先完成清潔師資料填寫</p>
            <Link
              href="/provider/onboarding"
              className="inline-flex px-6 py-3 bg-[#8FAD82] text-white rounded-xl text-sm font-medium hover:bg-[#6B8F5E] transition-colors"
            >
              開始填寫資料
            </Link>
          </div>
        ) : children}
      </main>
    </div>
  )
}
