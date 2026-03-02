import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PayoutRow {
  cleaner_id: string
  amount: number
}

interface CleanerRow {
  profile_id: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ payoutId: string }> }
) {
  const { payoutId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rawProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = rawProfile as unknown as { role: string } | null
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status, transferRef } = await request.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: rawPayout, error } = await sb
    .from('payouts')
    .update({
      status,
      transfer_ref: transferRef,
      processed_at: new Date().toISOString(),
    })
    .eq('id', payoutId)
    .select('cleaner_id, amount')
    .single()

  const payout = rawPayout as PayoutRow | null

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify cleaner
  if (payout && status === 'completed') {
    const { data: rawCleaner } = await sb
      .from('cleaners')
      .select('profile_id')
      .eq('id', payout.cleaner_id)
      .single()

    const cleaner = rawCleaner as CleanerRow | null

    if (cleaner) {
      await sb.from('notifications').insert({
        user_id: cleaner.profile_id,
        type: 'payout_sent',
        title: '款項已撥出',
        body: `NT$${payout.amount.toLocaleString('zh-TW')} 已轉入你的銀行帳戶。`,
        data: { payout_id: payoutId, transfer_ref: transferRef },
      })
    }
  }

  return NextResponse.json({ success: true })
}
