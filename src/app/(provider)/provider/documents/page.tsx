'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Document {
  id: string
  document_type: string
  file_url: string
  status: string
  created_at: string
}

const DOC_TYPES: { value: string; label: string; desc: string }[] = [
  { value: 'id_card', label: '身分證', desc: '正反面照片' },
  { value: 'background_check', label: '良民證', desc: '警察刑事紀錄證明書' },
  { value: 'insurance', label: '保險單', desc: '意外保險或責任保險' },
]

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '審核中', color: 'bg-amber-50 text-amber-700' },
  approved: { label: '已核准', color: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: '已拒絕', color: 'bg-red-50 text-red-700' },
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
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

      const { data: docs } = await sb
        .from('cleaner_documents')
        .select('*')
        .eq('cleaner_id', cleaner.id)
        .order('created_at', { ascending: false })

      if (docs) setDocuments(docs)
    }
    load()
  }, [])

  async function handleUpload(docType: string, file: File) {
    if (!cleanerId) return
    setUploading(docType)
    setError('')

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop()
    const path = `${cleanerId}/${docType}_${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('cleaner-documents')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('上傳失敗：' + uploadError.message)
      setUploading(null)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('cleaner-documents').getPublicUrl(path)

    // Insert document record
    const { error: dbError } = await sb.from('cleaner_documents').insert({
      cleaner_id: cleanerId,
      document_type: docType,
      file_url: publicUrl,
      status: 'pending',
    })

    if (dbError) {
      setError('記錄失敗：' + dbError.message)
    } else {
      // Reload documents
      const { data: docs } = await sb
        .from('cleaner_documents')
        .select('*')
        .eq('cleaner_id', cleanerId)
        .order('created_at', { ascending: false })
      if (docs) setDocuments(docs)
    }

    setUploading(null)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">驗證文件</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">上傳文件後由平台審核，通過後可接單</p>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {!cleanerId && (
        <div className="text-center py-12 text-[#9CA3AF]">
          <p>請先完成清潔師資料填寫後再上傳文件</p>
        </div>
      )}

      {cleanerId && (
        <div className="space-y-4">
          {DOC_TYPES.map(({ value, label, desc }) => {
            const existing = documents.filter(d => d.document_type === value)
            const latest = existing[0]
            const status = latest ? STATUS_MAP[latest.status] : null

            return (
              <div key={value} className="bg-white rounded-2xl border border-[#E8EDE6] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-[#1A1A1A] mb-1">{label}</h3>
                    <p className="text-sm text-[#9CA3AF]">{desc}</p>
                    {status && (
                      <span className={`inline-block mt-2 text-xs px-2.5 py-1 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={!!uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUpload(value, file)
                        }}
                      />
                      <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        uploading === value
                          ? 'bg-[#E8EDE6] text-[#9CA3AF] cursor-wait'
                          : 'bg-[#F8F9F6] text-[#6B7280] hover:bg-[#8FAD82] hover:text-white border border-[#E8EDE6]'
                      }`}>
                        {uploading === value ? '上傳中...' : latest ? '重新上傳' : '上傳文件'}
                      </span>
                    </label>
                  </div>
                </div>
                {latest && (
                  <div className="mt-3 pt-3 border-t border-[#E8EDE6]">
                    <a
                      href={latest.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#8FAD82] hover:underline"
                    >
                      查看已上傳文件 →
                    </a>
                  </div>
                )}
              </div>
            )
          })}

          <div className="bg-[#F8F9F6] rounded-2xl p-5 text-sm text-[#6B7280]">
            <p className="font-medium text-[#1A1A1A] mb-2">注意事項</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>文件審核通常需要 1-3 個工作天</li>
              <li>請確保文件清晰可辨</li>
              <li>支援 JPG、PNG、PDF 格式</li>
              <li>良民證請在 3 個月內申請</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
