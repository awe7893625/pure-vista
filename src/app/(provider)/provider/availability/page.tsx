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

interface Exception {
  id?: string
  exception_date: string
  note: string
}

function getTomorrowDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export default function AvailabilityPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [cleanerId, setCleanerId] = useState<string | null>(null)

  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [newExDate, setNewExDate] = useState('')
  const [newExNote, setNewExNote] = useState('')
  const [savingEx, setSavingEx] = useState(false)

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

      const { data: exData } = await sb
        .from('availability_exceptions')
        .select('*')
        .eq('cleaner_id', cleaner.id)
        .eq('is_blocked', true)
        .order('exception_date')

      if (exData?.length) setExceptions(exData)
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

  function setWeekdays() {
    const weekdayValues = [1, 2, 3, 4, 5]
    const otherRules = rules.filter(r => !weekdayValues.includes(Number(r.day_of_week)))
    const newRules = weekdayValues.map(d => ({ day_of_week: d, start_time: '09:00:00', end_time: '18:00:00' }))
    setRules([...otherRules, ...newRules])
  }

  function setWeekend() {
    const weekendValues = [6, 0]
    const otherRules = rules.filter(r => !weekendValues.includes(Number(r.day_of_week)))
    const newRules = weekendValues.map(d => ({ day_of_week: d, start_time: '09:00:00', end_time: '18:00:00' }))
    setRules([...otherRules, ...newRules])
  }

  function setAllDays() {
    setRules(DAY_VALUES.map(d => ({ day_of_week: d, start_time: '09:00:00', end_time: '18:00:00' })))
  }

  function clearAllDays() {
    setRules([])
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

  async function addException() {
    if (!cleanerId || !newExDate) return
    setSavingEx(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { data, error: insertError } = await sb.from('availability_exceptions').insert({
      cleaner_id: cleanerId,
      exception_date: newExDate,
      is_blocked: true,
      note: newExNote || null,
    }).select().single()

    if (!insertError && data) {
      setExceptions([...exceptions, data])
      setNewExDate('')
      setNewExNote('')
    }
    setSavingEx(false)
  }

  async function deleteException(id: string) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    await sb.from('availability_exceptions').delete().eq('id', id)
    setExceptions(exceptions.filter(e => e.id !== id))
  }

  function formatExceptionDate(dateStr: string) {
    return dateStr.replace(/-/g, '/')
  }

  const quickSetClass = "px-3 py-1.5 text-sm border border-[#E8EDE6] rounded-xl text-[#6B7280] hover:border-[#8FAD82] hover:text-[#8FAD82] transition-colors"

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
        <>
          {/* Feature A: Batch Quick-Set Buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button onClick={setWeekdays} className={quickSetClass}>全選平日</button>
            <button onClick={setWeekend} className={quickSetClass}>全選週末</button>
            <button onClick={setAllDays} className={quickSetClass}>全選</button>
            <button onClick={clearAllDays} className={quickSetClass}>清除</button>
          </div>

          {/* Weekly Rules */}
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

          {/* Feature B: Availability Exceptions */}
          <div className="mt-10">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">特定日期休假</h2>
              <p className="text-[#9CA3AF] text-sm mt-1">在特定日期暫停接單（如國定假日、個人休假）</p>
            </div>

            {/* Add Exception Form */}
            <div className="bg-white rounded-2xl border border-[#E8EDE6] p-5 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={newExDate}
                  min={getTomorrowDate()}
                  onChange={(e) => setNewExDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#E8EDE6] text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#8FAD82]"
                />
                <input
                  type="text"
                  value={newExNote}
                  onChange={(e) => setNewExNote(e.target.value)}
                  placeholder="備註（選填）"
                  className="flex-1 min-w-[140px] px-3 py-1.5 rounded-xl border border-[#E8EDE6] text-sm text-[#1A1A1A] bg-white placeholder-[#C4CABD] focus:outline-none focus:ring-2 focus:ring-[#8FAD82]"
                />
                <button
                  onClick={addException}
                  disabled={savingEx || !newExDate}
                  className="px-4 py-1.5 bg-[#8FAD82] text-white rounded-xl text-sm font-medium hover:bg-[#6B8F5E] transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {savingEx ? '新增中...' : '新增'}
                </button>
              </div>
            </div>

            {/* Exception List */}
            {exceptions.length === 0 ? (
              <div className="text-center py-8 text-[#9CA3AF] text-sm bg-white rounded-2xl border border-[#E8EDE6]">
                尚未設定任何特定休假日
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E8EDE6] overflow-hidden">
                {exceptions.map((ex, idx) => (
                  <div
                    key={ex.id ?? idx}
                    className={`flex items-center justify-between px-5 py-3.5 ${idx < exceptions.length - 1 ? 'border-b border-[#E8EDE6]' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#8FAD82] text-base leading-none">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="1" y="3" width="14" height="12" rx="2" stroke="#8FAD82" strokeWidth="1.5"/>
                          <path d="M1 7H15" stroke="#8FAD82" strokeWidth="1.5"/>
                          <path d="M5 1V4" stroke="#8FAD82" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M11 1V4" stroke="#8FAD82" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <span className="text-sm font-medium text-[#1A1A1A]">{formatExceptionDate(ex.exception_date)}</span>
                      {ex.note && (
                        <span className="text-sm text-[#9CA3AF]">{ex.note}</span>
                      )}
                    </div>
                    <button
                      onClick={() => ex.id && deleteException(ex.id)}
                      className="text-sm text-[#9CA3AF] hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      刪除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
