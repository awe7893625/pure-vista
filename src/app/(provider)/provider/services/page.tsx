'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Service {
  id: string
  title: string
  description?: string
  duration_hours: number
  price_per_session: number
  is_active: boolean
  category?: { name: string; icon?: string }
}

interface Category {
  id: string
  name: string
  icon?: string
}

export default function ProviderServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    title: '', description: '', categoryId: '',
    durationHours: 2, pricePerSession: 1000, minAreaSqm: '', maxAreaSqm: '',
  })

  const loadServices = useCallback(async () => {
    const res = await fetch('/api/provider/services')
    if (res.ok) setServices(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    loadServices()
    const supabase = createClient()
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => setCategories(data || []))
  }, [loadServices])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editingService ? `/api/provider/services/${editingService.id}` : '/api/provider/services'
    const method = editingService ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        categoryId: form.categoryId || null,
        durationHours: form.durationHours,
        pricePerSession: form.pricePerSession,
        minAreaSqm: form.minAreaSqm ? parseInt(form.minAreaSqm) : null,
        maxAreaSqm: form.maxAreaSqm ? parseInt(form.maxAreaSqm) : null,
      }),
    })

    if (res.ok) {
      setShowForm(false)
      setEditingService(null)
      setForm({ title: '', description: '', categoryId: '', durationHours: 2, pricePerSession: 1000, minAreaSqm: '', maxAreaSqm: '' })
      loadServices()
    }
  }

  async function toggleActive(service: Service) {
    // Find the category id by matching category name
    const cat = categories.find(c => c.name === service.category?.name)
    await fetch(`/api/provider/services/${service.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: service.title,
        description: service.description || null,
        categoryId: cat?.id || null,
        durationHours: service.duration_hours,
        pricePerSession: service.price_per_session,
        isActive: !service.is_active,
      }),
    })
    loadServices()
  }

  function startEdit(service: Service) {
    // Find category id by name
    const cat = categories.find(c => c.name === service.category?.name)
    setForm({
      title: service.title,
      description: service.description || '',
      categoryId: cat?.id || '',
      durationHours: service.duration_hours,
      pricePerSession: service.price_per_session,
      minAreaSqm: '',
      maxAreaSqm: '',
    })
    setEditingService(service)
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">服務項目</h1>
        <button
          onClick={() => { setShowForm(true); setEditingService(null) }}
          className="px-4 py-2 bg-[#8FAD82] text-white rounded-xl text-sm font-medium hover:bg-[#6B8F5E] transition-colors"
        >
          + 新增服務
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">
              {editingService ? '編輯服務' : '新增服務'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#6B7280] mb-1.5">服務名稱 *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="例：居家基礎清潔"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] text-[#1A1A1A] placeholder-[#9CA3AF] bg-white"
                />
              </div>
              <div>
                <label className="block text-sm text-[#6B7280] mb-1.5">服務說明</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="詳細說明服務內容..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] text-[#1A1A1A] placeholder-[#9CA3AF] bg-white resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-[#6B7280] mb-1.5">服務類別</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] text-[#1A1A1A] bg-white"
                >
                  <option value="">不分類</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#6B7280] mb-1.5">服務時數 *</label>
                  <input
                    type="number"
                    value={form.durationHours}
                    onChange={(e) => setForm({ ...form, durationHours: parseFloat(e.target.value) })}
                    min="0.5" step="0.5" required
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] text-[#1A1A1A] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#6B7280] mb-1.5">收費（NT$）*</label>
                  <input
                    type="number"
                    value={form.pricePerSession}
                    onChange={(e) => setForm({ ...form, pricePerSession: parseInt(e.target.value) })}
                    min="500" step="100" required
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E8EDE6] focus:outline-none focus:ring-2 focus:ring-[#8FAD82] text-[#1A1A1A] bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-[#E8EDE6] rounded-xl text-sm text-[#6B7280] hover:bg-[#F8F9F6]">
                  取消
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-[#8FAD82] text-white rounded-xl text-sm hover:bg-[#6B8F5E]">
                  {editingService ? '儲存' : '新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Services List */}
      {loading ? (
        <div className="text-center py-10 text-[#9CA3AF]">載入中...</div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF] bg-white rounded-2xl border border-[#E8EDE6]">
          <p className="text-4xl mb-3">✨</p>
          <p className="mb-4">還沒有服務項目，新增你的第一個服務吧</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {services.map((service) => (
            <div key={service.id} className="bg-white rounded-2xl border border-[#E8EDE6] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#1A1A1A]">{service.title}</h3>
                    {!service.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-[#F8F9F6] text-[#9CA3AF] border border-[#E8EDE6]">
                        已下架
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-[#6B7280] mb-2">{service.description}</p>
                  )}
                  <p className="text-sm text-[#9CA3AF]">{service.duration_hours} 小時</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-[#8FAD82]">
                    NT${service.price_per_session.toLocaleString('zh-TW')}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => startEdit(service)}
                      className="text-xs px-3 py-1.5 border border-[#E8EDE6] rounded-lg hover:bg-[#F8F9F6] text-[#6B7280]"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => toggleActive(service)}
                      className={`text-xs px-3 py-1.5 rounded-lg ${
                        service.is_active
                          ? 'border border-red-200 text-red-600 hover:bg-red-50'
                          : 'border border-green-200 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {service.is_active ? '下架' : '上架'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
