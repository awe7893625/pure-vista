import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface SearchParams {
  category?: string
  q?: string
  district?: string
}

interface CategoryRow {
  id: string
  name: string
  slug: string
  icon: string | null
}

interface CleanerServiceRow {
  id: string
  title: string
  price_per_session: number
  category: { name: string; slug: string } | null
}

interface CleanerRow {
  id: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  city: string
  district: string | null
  total_reviews: number
  average_rating: number
  services: CleanerServiceRow[]
}

async function searchCleaners(params: SearchParams) {
  const supabase = await createClient()
  let query = supabase
    .from('cleaners')
    .select(`
      id, display_name, bio, avatar_url, city, district,
      total_reviews, average_rating,
      services!inner(id, title, price_per_session, category_id,
        category:categories(name, slug))
    `)
    .eq('status', 'approved')
    .eq('services.is_active', true)

  if (params.category) {
    query = query.eq('services.category.slug', params.category)
  }
  if (params.district) {
    query = query.eq('district', params.district)
  }
  if (params.q) {
    query = query.or(`display_name.ilike.%${params.q}%,bio.ilike.%${params.q}%`)
  }

  const { data } = await query.order('average_rating', { ascending: false })
  return (data as unknown as CleanerRow[]) || []
}

async function getCategories() {
  const supabase = await createClient()
  const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order')
  return (data as unknown as CategoryRow[]) || []
}

export default async function CleanersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const [cleaners, categories] = await Promise.all([
    searchCleaners(params),
    getCategories(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[#1A1A1A] mb-2">尋找清潔師</h1>
        <p className="text-[#6B7280]">找到最適合你的專業清潔師</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/cleaners"
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            !params.category
              ? 'bg-[#8FAD82] text-white border-[#8FAD82]'
              : 'bg-white text-[#6B7280] border-[#E8EDE6] hover:border-[#8FAD82]'
          }`}
        >
          全部
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/cleaners?category=${cat.slug}`}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              params.category === cat.slug
                ? 'bg-[#8FAD82] text-white border-[#8FAD82]'
                : 'bg-white text-[#6B7280] border-[#E8EDE6] hover:border-[#8FAD82]'
            }`}
          >
            {cat.icon} {cat.name}
          </Link>
        ))}
      </div>

      {/* Results */}
      {cleaners.length === 0 ? (
        <div className="text-center py-20 text-[#9CA3AF]">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-lg mb-2">找不到符合條件的清潔師</p>
          <p className="text-sm">請嘗試其他搜尋條件</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cleaners.map((cleaner) => {
            const services = cleaner.services || []
            const minPrice = services.reduce(
              (min, s) => Math.min(min, s.price_per_session),
              Infinity
            )
            const catNames = [...new Set(
              services.map((s) => s.category?.name).filter((n): n is string => Boolean(n))
            )]

            return (
              <Link key={cleaner.id} href={`/cleaners/${cleaner.id}`}>
                <div className="bg-white rounded-2xl border border-[#E8EDE6] hover:shadow-md hover:border-[#8FAD82]/40 transition-all p-6 h-full">
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-[#8FAD82]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {cleaner.avatar_url ? (
                        <img
                          src={cleaner.avatar_url}
                          alt={cleaner.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[#8FAD82] text-xl font-semibold">
                          {cleaner.display_name[0]}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#1A1A1A] truncate">
                        {cleaner.display_name}
                      </h3>
                      <p className="text-sm text-[#9CA3AF]">
                        {cleaner.city} {cleaner.district}
                      </p>
                    </div>
                  </div>

                  {/* Categories */}
                  {catNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {catNames.slice(0, 3).map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-0.5 rounded-full text-xs bg-[#8FAD82]/10 text-[#6B8F5E]"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bio */}
                  {cleaner.bio && (
                    <p className="text-sm text-[#6B7280] mb-4 line-clamp-2">
                      {cleaner.bio}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400">★</span>
                      <span className="text-sm font-medium text-[#1A1A1A]">
                        {cleaner.average_rating > 0
                          ? Number(cleaner.average_rating).toFixed(1)
                          : '新'}
                      </span>
                      {cleaner.total_reviews > 0 && (
                        <span className="text-xs text-[#9CA3AF]">
                          ({cleaner.total_reviews})
                        </span>
                      )}
                    </div>
                    {minPrice !== Infinity && (
                      <span className="text-sm font-semibold text-[#8FAD82]">
                        NT${minPrice.toLocaleString('zh-TW')} 起
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
