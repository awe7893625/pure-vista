import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { role: string; full_name: string } | null

  if (!profile || profile.role !== 'admin') redirect('/')

  const navItems = [
    { href: '/admin/dashboard', label: '儀表板', icon: '📊' },
    { href: '/admin/cleaners', label: '清潔師管理', icon: '👤' },
    { href: '/admin/bookings', label: '訂單管理', icon: '📋' },
    { href: '/admin/payouts', label: '撥款管理', icon: '💰' },
    { href: '/admin/reviews', label: '評價管理', icon: '⭐' },
    { href: '/admin/settings', label: '平台設定', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9F6] flex">
      <aside className="w-56 bg-[#1A1A1A] flex flex-col fixed left-0 top-0 h-full">
        <div className="p-5 border-b border-white/10">
          <p className="font-bold text-white text-sm">澄境清潔</p>
          <p className="text-xs text-white/40">Admin 後台</p>
        </div>
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-xs text-white/60 truncate">{profile.full_name}</p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#8FAD82]/20 text-[#8FAD82]">管理員</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <Link href="/" className="text-xs text-white/40 hover:text-white/60">← 返回前台</Link>
        </div>
      </aside>
      <main className="flex-1 ml-56 p-8">{children}</main>
    </div>
  )
}
