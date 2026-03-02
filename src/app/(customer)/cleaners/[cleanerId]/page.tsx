import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface CategoryRow {
  name: string
  icon?: string
}

interface ServiceRow {
  id: string
  title: string
  description?: string
  duration_hours: number
  price_per_session: number
  min_area_sqm?: number
  max_area_sqm?: number
  is_active: boolean
  category: CategoryRow | null
}

interface ReviewRow {
  id: string
  rating: number
  comment?: string
  created_at: string
  customer: { full_name: string } | null
}

interface CleanerRow {
  id: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  city: string
  district: string | null
  average_rating: number
  total_reviews: number
  total_bookings: number
  services: ServiceRow[]
  reviews: ReviewRow[]
}

async function getCleaner(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cleaners')
    .select(`
      *,
      profile:profiles(email),
      services(*, category:categories(name, icon)),
      reviews(rating, comment, created_at, customer:profiles(full_name))
    `)
    .eq('id', id)
    .eq('status', 'approved')
    .single()
  return data as unknown as CleanerRow | null
}

export default async function CleanerPage({ params }: { params: Promise<{ cleanerId: string }> }) {
  const { cleanerId } = await params
  const cleaner = await getCleaner(cleanerId)
  if (!cleaner) notFound()

  const activeServices = cleaner.services?.filter((s) => s.is_active) || []
  const reviews = cleaner.reviews || []

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Back */}
      <Link href="/cleaners" className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#1A1A1A] mb-6 transition-colors">
        ← 返回列表
      </Link>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-[#E8EDE6] p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-[#8FAD82]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            {cleaner.avatar_url ? (
              <img src={cleaner.avatar_url} alt={cleaner.display_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#8FAD82] text-3xl font-semibold">{cleaner.display_name[0]}</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-1">{cleaner.display_name}</h1>
            <p className="text-[#9CA3AF] mb-3">{cleaner.city} {cleaner.district}</p>
            <div className="flex items-center gap-4">
              {cleaner.average_rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400">★</span>
                  <span className="font-semibold text-[#1A1A1A]">{Number(cleaner.average_rating).toFixed(1)}</span>
                  <span className="text-[#9CA3AF] text-sm">({cleaner.total_reviews} 則評價)</span>
                </div>
              )}
              <span className="text-[#9CA3AF] text-sm">{cleaner.total_bookings} 次服務</span>
            </div>
          </div>
        </div>
        {cleaner.bio && (
          <p className="mt-6 text-[#6B7280] leading-relaxed border-t border-[#E8EDE6] pt-6">
            {cleaner.bio}
          </p>
        )}
      </div>

      {/* Services */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">提供服務</h2>
        {activeServices.length === 0 ? (
          <p className="text-[#9CA3AF] text-sm">暫無服務項目</p>
        ) : (
          <div className="grid gap-4">
            {activeServices.map((service) => (
              <div key={service.id} className="bg-white rounded-2xl border border-[#E8EDE6] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {service.category && (
                        <span className="text-lg">{service.category.icon}</span>
                      )}
                      <h3 className="font-semibold text-[#1A1A1A]">{service.title}</h3>
                    </div>
                    {service.description && (
                      <p className="text-sm text-[#6B7280] mb-3">{service.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm text-[#9CA3AF]">
                      <span>⏱ {service.duration_hours} 小時</span>
                      {service.min_area_sqm && (
                        <span>📐 {service.min_area_sqm}–{service.max_area_sqm} 坪</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-semibold text-[#8FAD82]">
                      NT${service.price_per_session.toLocaleString('zh-TW')}
                    </p>
                    <p className="text-xs text-[#9CA3AF] mb-3">/ 次</p>
                    <Link
                      href={`/book/${cleaner.id}?service=${service.id}`}
                      className="inline-flex items-center justify-center px-5 py-2 bg-[#8FAD82] text-white rounded-xl text-sm font-medium hover:bg-[#6B8F5E] transition-colors"
                    >
                      立即預約
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">客戶評價</h2>
          <div className="grid gap-4">
            {reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="bg-white rounded-2xl border border-[#E8EDE6] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-[#1A1A1A] text-sm">
                    {review.customer?.full_name || '匿名'}
                  </span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`text-sm ${i < review.rating ? 'text-amber-400' : 'text-[#E8EDE6]'}`}>★</span>
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-[#6B7280]">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
