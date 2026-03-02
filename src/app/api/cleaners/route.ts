import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const district = searchParams.get('district')
  const q = searchParams.get('q')

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  let query = sb
    .from('cleaners')
    .select(`
      id, display_name, bio, avatar_url, city, district,
      total_reviews, average_rating,
      services(id, title, price_per_session, category:categories(name, slug))
    `)
    .eq('status', 'approved')

  if (district) query = query.eq('district', district)
  if (q) query = query.or(`display_name.ilike.%${q}%,bio.ilike.%${q}%`)

  const { data, error } = await query.order('average_rating', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter by category in application code (nested filter limitation)
  let results = (data as CleanerRow[]) || []
  if (category) {
    results = results.filter((c) =>
      c.services?.some((s) => s.category?.slug === category)
    )
  }

  return NextResponse.json(results)
}
