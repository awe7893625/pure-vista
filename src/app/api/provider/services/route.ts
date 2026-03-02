import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getApprovedCleanerId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('cleaners')
    .select('id')
    .eq('profile_id', userId)
    .eq('status', 'approved')
    .single()
  const row = data as unknown as { id: string } | null
  return row?.id
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cleanerId = await getApprovedCleanerId(supabase, user.id)
  if (!cleanerId) return NextResponse.json({ error: 'Not a cleaner' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data, error } = await sb
    .from('services')
    .select('*, category:categories(name, slug)')
    .eq('cleaner_id', cleanerId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cleanerId = await getApprovedCleanerId(supabase, user.id)
  if (!cleanerId) return NextResponse.json({ error: 'Not a cleaner' }, { status: 403 })

  const body = await request.json()
  const { title, description, categoryId, durationHours, pricePerSession, minAreaSqm, maxAreaSqm, serviceArea } = body

  if (!title || !pricePerSession || !durationHours) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data, error } = await sb
    .from('services')
    .insert({
      cleaner_id: cleanerId,
      category_id: categoryId || null,
      title,
      description: description || null,
      duration_hours: durationHours,
      price_per_session: pricePerSession,
      min_area_sqm: minAreaSqm || null,
      max_area_sqm: maxAreaSqm || null,
      service_area: serviceArea || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
