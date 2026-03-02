import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarkReadEffect from './MarkReadEffect'

interface NotificationRow {
  id: string
  type: string
  title: string
  body: string | null
  is_read: boolean
  created_at: string
}

const TYPE_ICON: Record<string, string> = {
  booking_confirmed: '✅',
  booking_cancelled: '❌',
  booking_completed: '🎉',
  payout_scheduled: '💰',
  review_received: '⭐',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawNotifs } = await (supabase as any)
    .from('notifications')
    .select('id, type, title, body, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications = (rawNotifs || []) as NotificationRow[]

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <MarkReadEffect />
      <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-6">通知</h1>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF] bg-white rounded-2xl border border-[#E8EDE6]">
          <p className="text-4xl mb-3">🔔</p>
          <p>目前沒有通知</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-2xl border p-4 flex items-start gap-3 ${
                n.is_read ? 'border-[#E8EDE6]' : 'border-[#8FAD82]/30 bg-[#8FAD82]/5'
              }`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] || '📢'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${n.is_read ? 'text-[#6B7280]' : 'text-[#1A1A1A]'}`}>
                    {n.title}
                  </p>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[#8FAD82] flex-shrink-0 mt-1.5" />
                  )}
                </div>
                {n.body && (
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{n.body}</p>
                )}
                <p className="text-xs text-[#9CA3AF] mt-1">
                  {new Date(n.created_at).toLocaleString('zh-TW', {
                    month: 'numeric', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
