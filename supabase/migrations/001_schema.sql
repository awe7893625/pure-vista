-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (maps to Supabase Auth users)
CREATE TYPE user_role AS ENUM ('customer', 'cleaner', 'admin');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cleaners (extended profile for cleaners)
CREATE TYPE cleaner_status AS ENUM ('pending', 'approved', 'suspended');

CREATE TABLE cleaners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  city TEXT NOT NULL DEFAULT '台北',
  district TEXT,
  status cleaner_status NOT NULL DEFAULT 'pending',
  -- Bank info for payouts
  bank_code TEXT,
  bank_account TEXT,
  bank_account_name TEXT,
  -- Stats (denormalized for performance)
  total_reviews INTEGER NOT NULL DEFAULT 0,
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_bookings INTEGER NOT NULL DEFAULT 0,
  -- Timestamps
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Services (listed by cleaners)
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT,
  duration_hours NUMERIC(4,1) NOT NULL DEFAULT 2,
  price_per_session INTEGER NOT NULL, -- TWD, integer
  min_area_sqm INTEGER,
  max_area_sqm INTEGER,
  service_area TEXT[], -- districts served
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Availability Rules (weekly recurring)
CREATE TYPE day_of_week AS ENUM ('0','1','2','3','4','5','6'); -- 0=Sun

CREATE TABLE availability_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL, -- e.g. '09:00'
  end_time TIME NOT NULL,   -- e.g. '18:00'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Availability Exceptions (specific date blocks)
CREATE TABLE availability_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT TRUE, -- true=block, false=special open
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Booking status machine
CREATE TYPE booking_status AS ENUM (
  'pending_payment',
  'paid',
  'confirmed',
  'in_progress',
  'completed',
  'customer_confirmed',
  'cancelled',
  'disputed'
);

-- Bookings (core order table)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number TEXT NOT NULL UNIQUE, -- PV + timestamp + random
  customer_id UUID NOT NULL REFERENCES profiles(id),
  cleaner_id UUID NOT NULL REFERENCES cleaners(id),
  service_id UUID NOT NULL REFERENCES services(id),
  status booking_status NOT NULL DEFAULT 'pending_payment',
  -- Schedule
  scheduled_date DATE NOT NULL,
  scheduled_start_time TIME NOT NULL,
  scheduled_end_time TIME NOT NULL,
  -- Address
  address TEXT NOT NULL,
  district TEXT,
  area_sqm INTEGER,
  notes TEXT,
  -- Financials (all TWD integer, snapshot at booking time)
  total_amount INTEGER NOT NULL,
  platform_commission INTEGER NOT NULL, -- 10%
  cleaner_payout INTEGER NOT NULL,      -- 90%
  commission_rate NUMERIC(4,3) NOT NULL DEFAULT 0.100,
  -- Timestamps
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  customer_confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments (ECPay records)
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  ecpay_trade_no TEXT,            -- ECPay MerchantTradeNo
  ecpay_transaction_id TEXT,      -- ECPay TradeNo returned
  amount INTEGER NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  raw_notify JSONB,               -- raw ECPay notify payload
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  cleaner_id UUID NOT NULL REFERENCES cleaners(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  cleaner_reply TEXT,
  cleaner_replied_at TIMESTAMPTZ,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Payouts (cleaner disbursements)
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cleaner_id UUID NOT NULL REFERENCES cleaners(id),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  amount INTEGER NOT NULL,
  status payout_status NOT NULL DEFAULT 'pending',
  transfer_ref TEXT,   -- bank transfer reference
  notes TEXT,
  eligible_at TIMESTAMPTZ NOT NULL, -- customer_confirmed_at + 14 days
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Cleaner Documents
CREATE TYPE document_type AS ENUM ('id_card', 'criminal_check', 'certificate');
CREATE TYPE document_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE cleaner_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  doc_type document_type NOT NULL,
  file_url TEXT NOT NULL,
  status document_status NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Booking Status Logs
CREATE TABLE booking_status_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status booking_status,
  to_status booking_status NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform Settings
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TYPE notification_type AS ENUM (
  'booking_created', 'booking_confirmed', 'booking_cancelled',
  'payment_received', 'payout_sent', 'review_received', 'cleaner_approved'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_cleaner ON bookings(cleaner_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_scheduled_date ON bookings(scheduled_date);
CREATE INDEX idx_services_cleaner ON services(cleaner_id);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_availability_rules_cleaner ON availability_rules(cleaner_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_payouts_cleaner ON payouts(cleaner_id, status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cleaners_updated_at BEFORE UPDATE ON cleaners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
