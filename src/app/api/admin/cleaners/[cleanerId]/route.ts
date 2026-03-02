import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CleanerRow {
  profile_id: string
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: rawProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = rawProfile as unknown as { role: string } | null
  if (profile?.role !== 'admin') return null
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cleanerId: string }> }
) {
  const { cleanerId } = await params
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { status } = await request.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const updateData: Record<string, unknown> = { status }
  if (status === 'approved') updateData.approved_at = new Date().toISOString()

  const { error } = await sb
    .from('cleaners')
    .update(updateData)
    .eq('id', cleanerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify cleaner
  const { data: rawCleaner } = await sb
    .from('cleaners')
    .select('profile_id')
    .eq('id', cleanerId)
    .single()

  const cleaner = rawCleaner as CleanerRow | null

  if (cleaner && status === 'approved') {
    await sb.from('notifications').insert({
      user_id: cleaner.profile_id,
      type: 'cleaner_approved',
      title: '恭喜！審核通過',
      body: '你的清潔師申請已通過審核，現在可以上架服務開始接單了。',
      data: { cleaner_id: cleanerId },
    })
  }

  return NextResponse.json({ success: true })
}
