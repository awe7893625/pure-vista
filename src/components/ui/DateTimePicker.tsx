'use client'
import { useState, useEffect, useCallback } from 'react'

interface DateTimePickerProps {
  cleanerId: string
  serviceDurationHours: number
  selectedDate: string   // YYYY-MM-DD or ''
  selectedTime: string   // HH:MM or ''
  onSelect: (date: string, time: string) => void
}

interface DayInfo {
  hasRule: boolean
  isBlocked: boolean
  isPast: boolean
}

interface DayData {
  rule: { start_time: string; end_time: string } | null
  isBlocked: boolean
  bookedRanges: { start: string; end: string }[]
}

/** Convert "HH:MM" or "HH:MM:SS" to minutes since midnight */
function timeToMinutes(t: string): number {
  const parts = t.split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

/** Format YYYY-MM-DD to locale string like "2026年3月15日（週日）" */
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const weekDays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
  const dow = new Date(y, m - 1, d).getDay()
  return `${y}年${m}月${d}日（${weekDays[dow]}）`
}

function zeroPad(n: number): string {
  return String(n).padStart(2, '0')
}

const WEEKDAY_HEADERS = ['日', '一', '二', '三', '四', '五', '六']
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export default function DateTimePicker({
  cleanerId,
  serviceDurationHours,
  selectedDate,
  selectedTime,
  onSelect,
}: DateTimePickerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState<number>(today.getFullYear())
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth()) // 0-indexed
  const [monthData, setMonthData] = useState<Record<string, DayInfo> | null>(null)
  const [dayData, setDayData] = useState<DayData | null>(null)
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [loadingDay, setLoadingDay] = useState(false)

  // ── Fetch month data ─────────────────────────────────────────────────────
  const fetchMonthData = useCallback(async (year: number, month: number) => {
    setLoadingMonth(true)
    setMonthData(null)
    try {
      const paddedMonth = zeroPad(month + 1) // convert 0-indexed to 1-indexed
      const res = await fetch(`/api/cleaners/${cleanerId}/slots?month=${year}-${paddedMonth}`)
      if (!res.ok) return
      const json = await res.json()
      setMonthData(json.days ?? null)
    } catch {
      // silently fail — calendar will show empty state
    } finally {
      setLoadingMonth(false)
    }
  }, [cleanerId])

  useEffect(() => {
    fetchMonthData(viewYear, viewMonth)
  }, [viewYear, viewMonth, fetchMonthData])

  // ── Fetch day data when selectedDate changes ──────────────────────────────
  useEffect(() => {
    if (!selectedDate) {
      setDayData(null)
      return
    }
    async function fetchDayData() {
      setLoadingDay(true)
      setDayData(null)
      try {
        const res = await fetch(`/api/cleaners/${cleanerId}/slots?date=${selectedDate}`)
        if (!res.ok) return
        const json = await res.json()
        setDayData({
          rule: json.rule ?? null,
          isBlocked: json.isBlocked ?? false,
          bookedRanges: json.bookedRanges ?? [],
        })
      } catch {
        // silently fail
      } finally {
        setLoadingDay(false)
      }
    }
    fetchDayData()
  }, [selectedDate, cleanerId])

  // ── Month navigation ─────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1)
      setViewMonth(11)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1)
      setViewMonth(0)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  // ── Calendar grid ────────────────────────────────────────────────────────
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun

  // Empty leading cells
  const leadingBlanks = Array.from({ length: firstDayOfWeek })

  // Build day numbers
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Today's date string for highlighting
  const todayStr = `${today.getFullYear()}-${zeroPad(today.getMonth() + 1)}-${zeroPad(today.getDate())}`

  function handleDayClick(dayNum: number) {
    const dateStr = `${viewYear}-${zeroPad(viewMonth + 1)}-${zeroPad(dayNum)}`
    const info = monthData?.[dateStr]
    if (!info) return
    if (info.isPast || !info.hasRule || info.isBlocked) return
    onSelect(dateStr, '') // clear time when date changes
  }

  // ── Time slots ───────────────────────────────────────────────────────────
  function buildTimeSlots(): { time: string; isBooked: boolean }[] {
    if (!dayData?.rule) return []

    const startMin = timeToMinutes(dayData.rule.start_time)
    const endMin = timeToMinutes(dayData.rule.end_time)
    const durationMin = Math.round(serviceDurationHours * 60)
    const slots: { time: string; isBooked: boolean }[] = []

    for (let slotStart = startMin; slotStart + durationMin <= endMin; slotStart += 60) {
      const slotEnd = slotStart + durationMin
      const timeLabel = `${zeroPad(Math.floor(slotStart / 60))}:${zeroPad(slotStart % 60)}`

      const isBooked = dayData.bookedRanges.some((range) => {
        const rangeStart = timeToMinutes(range.start)
        const rangeEnd = timeToMinutes(range.end)
        return slotStart < rangeEnd && slotEnd > rangeStart
      })

      slots.push({ time: timeLabel, isBooked })
    }

    return slots
  }

  const timeSlots = selectedDate && dayData ? buildTimeSlots() : []

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="select-none">
      {/* ── Calendar ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#E8EDE6] overflow-hidden">
        {/* Month header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#F8F9F6]">
          <button
            type="button"
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E8EDE6] transition-colors text-[#6B7280] font-medium"
            aria-label="上個月"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-[#1A1A1A]">
            {viewYear}年{MONTH_NAMES[viewMonth]}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E8EDE6] transition-colors text-[#6B7280] font-medium"
            aria-label="下個月"
          >
            ›
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-[#E8EDE6]">
          {WEEKDAY_HEADERS.map((h) => (
            <div
              key={h}
              className="text-center text-xs text-[#9CA3AF] font-medium py-2"
            >
              {h}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {loadingMonth ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin w-6 h-6 border-2 border-[#8FAD82] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-7 p-2 gap-1">
            {leadingBlanks.map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {dayNumbers.map((dayNum) => {
              const dateStr = `${viewYear}-${zeroPad(viewMonth + 1)}-${zeroPad(dayNum)}`
              const info = monthData?.[dateStr]
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === todayStr
              const isUnavailable = !info || info.isPast || !info.hasRule || info.isBlocked

              let cellClass =
                'relative flex items-center justify-center h-10 w-full rounded-full text-sm transition-colors '

              if (isSelected) {
                cellClass += 'bg-[#8FAD82] text-white font-semibold cursor-pointer'
              } else if (isUnavailable) {
                cellClass += 'text-[#D1D5DB] cursor-default'
              } else {
                cellClass += 'text-[#1A1A1A] cursor-pointer hover:bg-[#8FAD82]/10'
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleDayClick(dayNum)}
                  disabled={isUnavailable}
                  className={cellClass}
                  aria-label={dateStr}
                  aria-pressed={isSelected}
                >
                  <span>{dayNum}</span>
                  {/* Today indicator — small dot below number */}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8FAD82]" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Legend ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mt-2 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#8FAD82]" />
          <span className="text-xs text-[#9CA3AF]">可預約</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#E5E7EB]" />
          <span className="text-xs text-[#9CA3AF]">不可預約</span>
        </div>
      </div>

      {/* ── Time Slots ────────────────────────────────────────────────── */}
      {selectedDate && (
        <div className="mt-5">
          <p className="text-sm font-medium text-[#1A1A1A] mb-3">
            選擇時段
            <span className="font-normal text-[#6B7280] ml-2">— {formatDate(selectedDate)}</span>
          </p>

          {loadingDay ? (
            <div className="flex items-center gap-2 py-4 text-[#9CA3AF] text-sm">
              <div className="animate-spin w-4 h-4 border-2 border-[#8FAD82] border-t-transparent rounded-full" />
              載入時段中...
            </div>
          ) : !dayData?.rule || dayData.isBlocked ? (
            <p className="text-sm text-[#9CA3AF] py-2">此日無可用時段</p>
          ) : timeSlots.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] py-2">此日無符合服務時長的時段</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {timeSlots.map(({ time, isBooked }) => {
                const isSelected = time === selectedTime

                if (isBooked) {
                  return (
                    <div
                      key={time}
                      className="px-4 py-2 rounded-xl border border-[#E8EDE6] bg-[#F3F4F6] text-[#9CA3AF] text-sm line-through cursor-not-allowed"
                      title="此時段已被預約"
                    >
                      {time}
                    </div>
                  )
                }

                if (isSelected) {
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => onSelect(selectedDate, time)}
                      className="px-4 py-2 rounded-xl bg-[#8FAD82] text-white text-sm font-medium"
                    >
                      {time}
                    </button>
                  )
                }

                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => onSelect(selectedDate, time)}
                    className="px-4 py-2 rounded-xl border border-[#8FAD82] text-[#8FAD82] bg-white text-sm hover:bg-[#8FAD82]/5 transition-colors"
                  >
                    {time}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
