import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getApprovedCleanerId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('cleaners').select('id').eq('profile_id', userId).eq('status', 'approved').single()
  const row = data as unknown as { id: string } | null
  return row?.id
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cleanerId = await getApprovedCleanerId(supabase, user.id)
  if (!cleanerId) return NextResponse.json({ error: 'Not a cleaner' }, { status: 403 })

  const body = await request.json()
  const { title, description, categoryId, durationHours, pricePerSession, minAreaSqm, maxAreaSqm, serviceArea, isActive } = body

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data, error } = await sb
    .from('services')
    .update({
      title, description, category_id: categoryId,
      duration_hours: durationHours, price_per_session: pricePerSession,
      min_area_sqm: minAreaSqm, max_area_sqm: maxAreaSqm,
      service_area: serviceArea, is_active: isActive,
    })
    .eq('id', serviceId)
    .eq('cleaner_id', cleanerId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cleanerId = await getApprovedCleanerId(supabase, user.id)
  if (!cleanerId) return NextResponse.json({ error: 'Not a cleaner' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb
    .from('services')
    .update({ is_active: false })
    .eq('id', serviceId)
    .eq('cleaner_id', cleanerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
