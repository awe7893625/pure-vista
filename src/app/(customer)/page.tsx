import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface CategoryRow {
  id: string
  name: string
  slug: string
  icon: string | null
}

interface FeaturedCleanerRow {
  id: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  city: string
  district: string | null
  total_reviews: number
  average_rating: number
  services: { id: string; title: string; price_per_session: number }[]
}

async function getFeaturedCleaners() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cleaners')
    .select(`
      id, display_name, bio, avatar_url, city, district,
      total_reviews, average_rating,
      services(id, title, price_per_session, category:categories(name, slug))
    `)
    .eq('status', 'approved')
    .order('average_rating', { ascending: false })
    .limit(6)
  return (data as unknown as FeaturedCleanerRow[]) || []
}

async function getCategories() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  return (data as unknown as CategoryRow[]) || []
}

export default async function HomePage() {
  const [cleaners, categories] = await Promise.all([
    getFeaturedCleaners(),
    getCategories(),
  ])

  return (
    <main>
      {/* Hero */}
      <section className="px-4 py-20 md:py-32 text-center max-w-4xl mx-auto">
        <p className="text-sm font-medium tracking-widest text-[#8FAD82] uppercase mb-4">
          Pure Vista
        </p>
        <h1 className="text-4xl md:text-6xl font-light text-[#1A1A1A] leading-tight mb-6">
          讓清潔成為<br />
          <span className="font-semibold">一種享受</span>
        </h1>
        <p className="text-lg text-[#6B7280] mb-10 max-w-xl mx-auto leading-relaxed">
          精選專業清潔師，提供居家、冷氣、深度清潔服務。
          <br />線上預約，安心付款，讓家回到最美的樣子。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/cleaners"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-[#8FAD82] text-white rounded-xl font-medium hover:bg-[#6B8F5E] transition-colors"
          >
            尋找清潔師
          </Link>
          <Link
            href="/auth/register?role=cleaner"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-[#1A1A1A] border border-[#E8EDE6] rounded-xl font-medium hover:bg-[#F8F9F6] transition-colors"
          >
            成為清潔師
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-semibold text-[#1A1A1A] mb-8 text-center">服務類別</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/cleaners?category=${cat.slug}`}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-[#E8EDE6] hover:border-[#8FAD82] hover:shadow-sm transition-all group"
              >
                <span className="text-3xl">{cat.icon}</span>
                <span className="text-sm font-medium text-[#1A1A1A] group-hover:text-[#8FAD82] text-center">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Cleaners */}
      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-2xl font-semibold text-[#1A1A1A]">精選清潔師</h2>
            <Link href="/cleaners" className="text-sm text-[#8FAD82] hover:underline">
              查看全部 →
            </Link>
          </div>
          {cleaners.length === 0 ? (
            <div className="text-center py-16 text-[#9CA3AF]">
              <p className="text-4xl mb-4">✨</p>
              <p>清潔師陸續進駐中，敬請期待</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cleaners.map((cleaner) => {
                const minPrice = cleaner.services?.reduce(
                  (min: number, s: { price_per_session: number }) => Math.min(min, s.price_per_session),
                  Infinity
                )
                return (
                  <Link key={cleaner.id} href={`/cleaners/${cleaner.id}`}>
                    <div className="bg-white rounded-2xl border border-[#E8EDE6] hover:shadow-md transition-all p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-full bg-[#8FAD82]/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {cleaner.avatar_url ? (
                            <img src={cleaner.avatar_url} alt={cleaner.display_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[#8FAD82] text-xl font-semibold">
                              {cleaner.display_name[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#1A1A1A]">{cleaner.display_name}</h3>
                          <p className="text-sm text-[#6B7280]">{cleaner.city} {cleaner.district}</p>
                        </div>
                      </div>
                      {cleaner.bio && (
                        <p className="text-sm text-[#6B7280] mb-4 line-clamp-2">{cleaner.bio}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400 text-sm">★</span>
                          <span className="text-sm font-medium text-[#1A1A1A]">
                            {cleaner.average_rating > 0 ? Number(cleaner.average_rating).toFixed(1) : '新'}
                          </span>
                          {cleaner.total_reviews > 0 && (
                            <span className="text-sm text-[#9CA3AF]">({cleaner.total_reviews})</span>
                          )}
                        </div>
                        {minPrice !== Infinity && (
                          <span className="text-sm font-medium text-[#8FAD82]">
                            NT${minPrice?.toLocaleString('zh-TW')} 起
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
      </section>

      {/* How it works */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-[#1A1A1A] mb-12">如何使用</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: '搜尋清潔師', desc: '依服務類別、地區、評分篩選合適的清潔師' },
              { step: '02', title: '選擇時段預約', desc: '查看清潔師的可用時段，線上確認預約' },
              { step: '03', title: '安心完成清潔', desc: '信用卡付款，清潔完成後確認驗收' },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-[#8FAD82]/10 text-[#8FAD82] font-semibold text-sm flex items-center justify-center">
                  {item.step}
                </span>
                <h3 className="font-semibold text-[#1A1A1A]">{item.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-[#1A1A1A] mb-4">準備好了嗎？</h2>
          <p className="text-[#6B7280] mb-8">立即找到適合你的清潔師，讓家煥然一新。</p>
          <Link
            href="/cleaners"
            className="inline-flex items-center justify-center px-10 py-4 bg-[#8FAD82] text-white rounded-xl font-medium hover:bg-[#6B8F5E] transition-colors text-base"
          >
            開始搜尋
          </Link>
        </div>
      </section>
    </main>
  )
}
