import { BookingStatus } from '@/types/database'

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: '待付款',
  paid: '已付款',
  confirmed: '已確認',
  in_progress: '清潔中',
  completed: '已完成',
  customer_confirmed: '已驗收',
  cancelled: '已取消',
  disputed: '爭議中',
}

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  pending_payment: 'text-amber-600 bg-amber-50',
  paid: 'text-blue-600 bg-blue-50',
  confirmed: 'text-green-600 bg-green-50',
  in_progress: 'text-purple-600 bg-purple-50',
  completed: 'text-teal-600 bg-teal-50',
  customer_confirmed: 'text-emerald-600 bg-emerald-50',
  cancelled: 'text-red-600 bg-red-50',
  disputed: 'text-orange-600 bg-orange-50',
}

export function generateBookingNumber(): string {
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
  const rand = Math.random().toString(36).substring(2,8).toUpperCase()
  return `PV${date}${rand}`
}

export function calculateFinancials(totalAmount: number, commissionRate = 0.10) {
  const platformCommission = Math.round(totalAmount * commissionRate)
  const cleanerPayout = totalAmount - platformCommission
  return { platformCommission, cleanerPayout, commissionRate }
}

export function getPayoutEligibleDate(customerConfirmedAt: Date, delayDays = 14): Date {
  const d = new Date(customerConfirmedAt)
  d.setDate(d.getDate() + delayDays)
  return d
}
