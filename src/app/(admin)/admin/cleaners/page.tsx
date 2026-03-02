import { createClient } from '@/lib/supabase/server'
import AdminCleanerActions from './AdminCleanerActions'

interface CleanerRow {
  id: string; display_name: string; bio: string | null; city: string; district: string | null
  status: string; total_bookings: number; average_rating: number; total_reviews: number
  created_at: string; profile: { email: string; phone: string | null } | null
  services: { id: string }[] | null
}

export default async function AdminCleanersPage() {
  const supabase = await createClient()

  const { data: cleanersRaw } = await supabase
    .from('cleaners')
    .select(`
      id, display_name, bio, city, district, status,
      total_bookings, average_rating, total_reviews, created_at,
      profile:profiles(email, phone),
      services(id)
    `)
    .order('created_at', { ascending: false })
  const cleaners = cleanersRaw as unknown as CleanerRow[]

  const STATUS_LABELS: Record<string, string> = {
    pending: '待審核', approved: '已核准', suspended: '已停用',
  }
  const STATUS_COLORS: Record<string, string> = {
    pending: 'text-amber-600 bg-amber-50',
    approved: 'text-emerald-600 bg-emerald-50',
    suspended: 'text-red-600 bg-red-50',
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-6">清潔師管理</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {['全部', '待審核', '已核准', '已停用'].map((tab) => (
          <button key={tab} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === '全部' ? 'bg-[#8FAD82] text-white' : 'bg-white border border-[#E8EDE6] text-[#6B7280] hover:border-[#8FAD82]'
          }`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {cleaners?.map((cleaner) => {
          const profile = cleaner.profile

          return (
            <div key={cleaner.id} className="bg-white rounded-2xl border border-[#E8EDE6] p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#1A1A1A]">{cleaner.display_name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[cleaner.status]}`}>
                      {STATUS_LABELS[cleaner.status]}
                    </span>
                  </div>
                  <p className="text-sm text-[#9CA3AF] mb-2">
                    {profile?.email} · {cleaner.city} {cleaner.district}
                  </p>
                  {cleaner.bio && (
                    <p className="text-sm text-[#6B7280] line-clamp-2 mb-3">{cleaner.bio}</p>
                  )}
                  <div className="flex gap-4 text-xs text-[#9CA3AF]">
                    <span>📊 {cleaner.total_bookings} 筆訂單</span>
                    <span>⭐ {cleaner.average_rating > 0 ? Number(cleaner.average_rating).toFixed(1) : '無評分'}</span>
                    <span>🗓 申請時間：{new Date(cleaner.created_at).toLocaleDateString('zh-TW')}</span>
                    <span>🛎 服務數量：{cleaner.services?.length || 0}</span>
                  </div>
                </div>

                <AdminCleanerActions cleanerId={cleaner.id} currentStatus={cleaner.status} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
