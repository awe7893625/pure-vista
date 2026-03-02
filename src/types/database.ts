// ============================================================
// Enum Types
// ============================================================

export type UserRole = 'customer' | 'cleaner' | 'admin'

export type CleanerStatus = 'pending' | 'approved' | 'suspended'

export type BookingStatus =
  | 'pending_payment'
  | 'paid'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'customer_confirmed'
  | 'cancelled'
  | 'disputed'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type DocumentType = 'id_card' | 'criminal_check' | 'certificate'

export type DocumentStatus = 'pending' | 'approved' | 'rejected'

export type NotificationType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'payment_received'
  | 'payout_sent'
  | 'review_received'
  | 'cleaner_approved'

export type DayOfWeek = '0' | '1' | '2' | '3' | '4' | '5' | '6'

// ============================================================
// Table Interfaces
// ============================================================

export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Cleaner {
  id: string
  profile_id: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  city: string
  district: string | null
  status: CleanerStatus
  // Bank info for payouts
  bank_code: string | null
  bank_account: string | null
  bank_account_name: string | null
  // Stats (denormalized for performance)
  total_reviews: number
  average_rating: number
  total_bookings: number
  // Timestamps
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Service {
  id: string
  cleaner_id: string
  category_id: string | null
  title: string
  description: string | null
  duration_hours: number
  price_per_session: number
  min_area_sqm: number | null
  max_area_sqm: number | null
  service_area: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AvailabilityRule {
  id: string
  cleaner_id: string
  day_of_week: DayOfWeek
  start_time: string // e.g. '09:00'
  end_time: string   // e.g. '18:00'
  is_active: boolean
  created_at: string
}

export interface AvailabilityException {
  id: string
  cleaner_id: string
  exception_date: string // ISO date string 'YYYY-MM-DD'
  is_blocked: boolean
  note: string | null
  created_at: string
}

export interface Booking {
  id: string
  booking_number: string
  customer_id: string
  cleaner_id: string
  service_id: string
  status: BookingStatus
  // Schedule
  scheduled_date: string       // ISO date 'YYYY-MM-DD'
  scheduled_start_time: string // e.g. '09:00'
  scheduled_end_time: string   // e.g. '11:00'
  // Address
  address: string
  district: string | null
  area_sqm: number | null
  notes: string | null
  // Financials (all TWD integer, snapshot at booking time)
  total_amount: number
  platform_commission: number
  cleaner_payout: number
  commission_rate: number
  // Timestamps
  paid_at: string | null
  confirmed_at: string | null
  completed_at: string | null
  customer_confirmed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  booking_id: string
  ecpay_trade_no: string | null
  ecpay_transaction_id: string | null
  amount: number
  status: PaymentStatus
  raw_notify: Record<string, unknown> | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  booking_id: string
  customer_id: string
  cleaner_id: string
  rating: number
  comment: string | null
  cleaner_reply: string | null
  cleaner_replied_at: string | null
  is_visible: boolean
  created_at: string
}

export interface Payout {
  id: string
  cleaner_id: string
  booking_id: string
  amount: number
  status: PayoutStatus
  transfer_ref: string | null
  notes: string | null
  eligible_at: string
  processed_at: string | null
  created_at: string
  updated_at: string
}

export interface CleanerDocument {
  id: string
  cleaner_id: string
  doc_type: DocumentType
  file_url: string
  status: DocumentStatus
  reviewer_notes: string | null
  reviewed_at: string | null
  created_at: string
}

export interface BookingStatusLog {
  id: string
  booking_id: string
  from_status: BookingStatus | null
  to_status: BookingStatus
  changed_by: string | null
  notes: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface PlatformSetting {
  key: string
  value: string
  description: string | null
  updated_at: string
}

// ============================================================
// Database type (for Supabase typed client)
// ============================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Profile, 'id'>>
        Relationships: []
      }
      cleaners: {
        Row: Cleaner
        Insert: Omit<Cleaner, 'id' | 'created_at' | 'updated_at' | 'total_reviews' | 'average_rating' | 'total_bookings'> & {
          id?: string
          created_at?: string
          updated_at?: string
          total_reviews?: number
          average_rating?: number
          total_bookings?: number
        }
        Update: Partial<Omit<Cleaner, 'id'>>
        Relationships: []
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Category, 'id'>>
        Relationships: []
      }
      services: {
        Row: Service
        Insert: Omit<Service, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Service, 'id'>>
        Relationships: []
      }
      availability_rules: {
        Row: AvailabilityRule
        Insert: Omit<AvailabilityRule, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<AvailabilityRule, 'id'>>
        Relationships: []
      }
      availability_exceptions: {
        Row: AvailabilityException
        Insert: Omit<AvailabilityException, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<AvailabilityException, 'id'>>
        Relationships: []
      }
      bookings: {
        Row: Booking
        Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Booking, 'id'>>
        Relationships: []
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Payment, 'id'>>
        Relationships: []
      }
      reviews: {
        Row: Review
        Insert: Omit<Review, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Review, 'id'>>
        Relationships: []
      }
      payouts: {
        Row: Payout
        Insert: Omit<Payout, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Payout, 'id'>>
        Relationships: []
      }
      cleaner_documents: {
        Row: CleanerDocument
        Insert: Omit<CleanerDocument, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<CleanerDocument, 'id'>>
        Relationships: []
      }
      booking_status_logs: {
        Row: BookingStatusLog
        Insert: Omit<BookingStatusLog, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<BookingStatusLog, 'id'>>
        Relationships: []
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Notification, 'id'>>
        Relationships: []
      }
      platform_settings: {
        Row: PlatformSetting
        Insert: Omit<PlatformSetting, 'updated_at'> & {
          updated_at?: string
        }
        Update: Partial<PlatformSetting>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      auth_user_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
      auth_cleaner_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      user_role: UserRole
      cleaner_status: CleanerStatus
      booking_status: BookingStatus
      payment_status: PaymentStatus
      payout_status: PayoutStatus
      document_type: DocumentType
      document_status: DocumentStatus
      notification_type: NotificationType
      day_of_week: DayOfWeek
    }
  }
}
