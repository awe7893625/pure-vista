'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const DAYS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0]

const HOURS = Array.from({ length: 14 }, (_, i) => {
  const h = i + 7
  return { label: `${String(h).padStart(2, '0')}:00`, value: `${String(h).padStart(2, '0')}:00:00` }
})

interface Rule {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
}

export default function AvailabilityPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [cleanerId, setCleanerId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: cleaner } = await sb.from('cleaners').select('id').eq('profile_id', user.id).single()
      if (!cleaner) return
      setCleanerId(cleaner.id)

      const { data: existingRules } = await sb
        .from('availability_rules')
        .select('*')
        .eq('cleaner_id', cleaner.id)
        .order('day_of_week')

      if (existingRules?.length) setRules(existingRules)
    }
    load()
  }, [])

  function toggleDay(day: number) {
    const exists = rules.find(r => Number(r.day_of_week) === day)
    if (exists) {
      setRules(rules.filter(r => Number(r.day_of_week) !== day))
    } else {
      setRules([...rules, { day_of_week: day, start_time: '09:00:00', end_time: '18:00:00' }])
    }
  }

  function updateRule(day: number, field: 'start_time' | 'end_time', value: string) {
    setRules(rules.map(r => Number(r.day_of_week) === day ? { ...r, [field]: value + ':00' } : r))
  }

  async function handleSave() {
    if (!cleanerId) return
    setSaving(true)
    setError('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Delete existing rules
    await sb.from('availability_rules').delete().eq('cleaner_id', cleanerId)

    // Insert new rules
    if (rules.length > 0) {
      const { error: insertError } = await sb.from('availability_rules').insert(
        rules.map(r => ({ cleaner_id: cleanerId, day_of_week: r.day_of_week, start_time: r.start_time, end_time: r.end_time }))
      )
      if (insertError) { setError('儲存失敗：' + insertError.message); setSaving(false); return }
    }

    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">可接單時段</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">設定每週可接受預約的時間</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !cleanerId}
          className="px-5 py-2.5 bg-[#8FAD82] text-white rounded-xl text-sm font-medium hover:bg-[#6B8F5E] transition-colors disabled:opacity-50"
        >
          {saving ? '儲存中...' : saved ? '✓ 已儲存' : '儲存設定'}
        </button>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
      {!cleanerId && (
        <div className="text-center py-12 text-[#9CA3AF]">
          <p>請先完成清潔師資料填寫後再設定時段</p>
        </div>
      )}

      {cleanerId && (
        <div className="space-y-3">
          {DAYS.map((dayLabel, i) => {
            const dayValue = DAY_VALUES[i]
            const rule = rules.find(r => Number(r.day_of_week) === dayValue)
            const isActive = !!rule

            return (
              <div
                key={dayValue}
                className={`bg-white rounded-2xl border p-5 transition-colors ${isActive ? 'border-[#8FAD82]' : 'border-[#E8EDE6]'}`}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleDay(dayValue)}
                    className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${isActive ? 'bg-[#8FAD82]' : 'bg-[#E8EDE6]'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm font-medium text-[#1A1A1A] w-10">{dayLabel}</span>

                  {isActive && (
                    <div className="flex items-center gap-3 ml-2">
                      <select
                        value={rule!.start_time.substring(0, 5)}
                        onChange={(e) => updateRule(dayValue, 'start_time', e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-[#E8EDE6] text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#8FAD82]"
                      >
                        {HOURS.map(h => <option key={h.value} value={h.label}>{h.label}</option>)}
                      </select>
                      <span className="text-[#9CA3AF] text-sm">至</span>
                      <select
                        value={rule!.end_time.substring(0, 5)}
                        onChange={(e) => updateRule(dayValue, 'end_time', e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-[#E8EDE6] text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#8FAD82]"
                      >
                        {HOURS.map(h => <option key={h.value} value={h.label}>{h.label}</option>)}
                      </select>
                    </div>
                  )}
                  {!isActive && <span className="text-sm text-[#9CA3AF] ml-2">休息</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
