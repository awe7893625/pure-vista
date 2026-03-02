'use client'
import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Service {
  id: string
  title: string
  price_per_session: number
  duration_hours: number
  description?: string
}

interface Cleaner {
  id: string
  display_name: string
  avatar_url?: string
  services: Service[]
}

interface CleanerRow {
  id: string
  display_name: string
  avatar_url?: string
  services: Service[]
}

export default function BookPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ service?: string }>
}) {
  const cleanerId = use(params).id
  const { service: serviceId } = use(searchParams)

  const [cleaner, setCleaner] = useState<Cleaner | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [address, setAddress] = useState('')
  const [areaSqm, setAreaSqm] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: rawData } = await supabase
        .from('cleaners')
        .select('id, display_name, avatar_url, services(*)')
        .eq('id', cleanerId)
        .single()
      const data = rawData as unknown as CleanerRow | null
      if (data) {
        setCleaner(data as Cleaner)
        const svc = serviceId
          ? data.services?.find((s: Service) => s.id === serviceId)
          : data.services?.[0]
        if (svc) setSelectedService(svc as Service)
      }
    }
    load()
  }, [cleanerId, serviceId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedService || !selectedDate || !selectedTime || !address) {
      setError('請填寫所有必填欄位')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleanerId,
        serviceId: selectedService.id,
        scheduledDate: selectedDate,
        scheduledStartTime: selectedTime,
        address,
        areaSqm: areaSqm ? parseInt(areaSqm) : null,
        notes,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || '預約失敗，請稍後再試')
      setLoading(false)
      return
    }

    router.push(`/book/${data.bookingId}/payment`)
  }

  // Generate available times
  const times = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 8
    return `${String(hour).padStart(2, '0')}:00`
  })

  // Min date: tomorrow
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  if (!cleaner) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-[#9CA3AF]">
        <div className="animate-spin w-8 h-8 border-2 border-[#8FAD82] border-t-transparent rounded-full mx-auto mb-4" />
        載入中...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/cleaners/${cleanerId}`} className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#1A1A1A] mb-6">
        ← 返回
      </Link>

      <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-2">預約清潔服務</h1>
      <p className="text-[#9CA3AF] text-sm mb-8">
        {cleaner.display_name} · {selectedService?.title}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service Selection */}
        {cleaner.services && cleaner.services.length > 1 && (
          <div className="bg-white rounded-2xl border border-[#E8EDE6] p-6">
            <h2 className="font-medium text-[#1A1A1A] mb-4">選擇服務</h2>
            <div className="space-y-3">
              {cleaner.services.filter((s) => s).map((service) => (
                <label
                  key={service.id}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                    selectedService?.id === service.id
                      ? 'border-[#8FAD82] bg-[#8FAD82]/5'
                      : 'border-[#E8EDE6] hover:border-[#8FAD82]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="service"
                      value={service.id}
                      checked={selectedService?.id === service.id}
                      onChange={() => setSelectedService(service)}
                      className="accent-[#8FAD82]"
                    />
                    <div>
                      <p className="font-medium text-[#1A1A1A] text-sm">{service.title}</p>
                      <p className="text-xs text-[#9CA3AF]">{service.duration_hours} 小時</p>
                    </div>
                  </div>
                  <span className="font-semibold text-[#8FAD82]">
                    NT${service.price_per_session.toLocaleString('zh-TW')}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Date & Time */}
        <div className="bg-white rounded-2xl border border-[#E8EDE6] p-6">
          <h2 className="font-medium text-[#1A1A1A] mb-4">選擇日期與時間</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#6B7280] mb-1.5">服務日期 *</label>
              <input
                type="date"
                value={selectedDate}
                min={minDateStr}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] focus:border-transparent text-[#1A1A1A] bg-white"
              />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1.5">開始時間 *</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] focus:border-transparent text-[#1A1A1A] bg-white"
              >
                <option value="">請選擇</option>
                {times.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl border border-[#E8EDE6] p-6">
          <h2 className="font-medium text-[#1A1A1A] mb-4">服務地址</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#6B7280] mb-1.5">完整地址 *</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="台北市信義區信義路五段7號"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] focus:border-transparent text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
              />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1.5">房屋坪數</label>
              <input
                type="number"
                value={areaSqm}
                onChange={(e) => setAreaSqm(e.target.value)}
                placeholder="例如：30"
                min="1"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] focus:border-transparent text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
              />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1.5">備註說明</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="如有特殊需求或注意事項，請在此說明"
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] focus:border-transparent text-[#1A1A1A] placeholder-[#9CA3AF] bg-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        {selectedService && (
          <div className="bg-[#8FAD82]/5 rounded-2xl border border-[#8FAD82]/20 p-6">
            <h2 className="font-medium text-[#1A1A1A] mb-4">訂單摘要</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">服務項目</span>
                <span className="text-[#1A1A1A]">{selectedService.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">服務時間</span>
                <span className="text-[#1A1A1A]">{selectedService.duration_hours} 小時</span>
              </div>
              <div className="border-t border-[#8FAD82]/20 my-3" />
              <div className="flex justify-between font-semibold text-base">
                <span className="text-[#1A1A1A]">總金額</span>
                <span className="text-[#8FAD82]">
                  NT${selectedService.price_per_session.toLocaleString('zh-TW')}
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[#8FAD82] text-white rounded-xl font-medium hover:bg-[#6B8F5E] transition-colors disabled:opacity-50 text-base"
        >
          {loading ? '建立訂單中...' : '確認預約並付款'}
        </button>

        <p className="text-center text-xs text-[#9CA3AF]">
          付款方式：信用卡（透過 ECPay 安全處理）
        </p>
      </form>
    </div>
  )
}
