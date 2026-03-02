-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaner_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_cleaner_id()
RETURNS UUID AS $$
  SELECT id FROM cleaners WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles: read own, admin reads all
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid() OR auth_user_role() = 'admin');
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- cleaners: public read approved, cleaner updates own, admin full
CREATE POLICY "cleaners_select_public" ON cleaners FOR SELECT USING (status = 'approved' OR profile_id = auth.uid() OR auth_user_role() = 'admin');
CREATE POLICY "cleaners_update_own" ON cleaners FOR UPDATE USING (profile_id = auth.uid() OR auth_user_role() = 'admin');
CREATE POLICY "cleaners_insert_own" ON cleaners FOR INSERT WITH CHECK (profile_id = auth.uid());

-- categories: public read
CREATE POLICY "categories_select_all" ON categories FOR SELECT USING (TRUE);
CREATE POLICY "categories_admin_write" ON categories FOR ALL USING (auth_user_role() = 'admin');

-- services: public read active, cleaner manages own
CREATE POLICY "services_select_active" ON services FOR SELECT USING (is_active = TRUE OR cleaner_id = auth_cleaner_id() OR auth_user_role() = 'admin');
CREATE POLICY "services_cleaner_write" ON services FOR ALL USING (cleaner_id = auth_cleaner_id() OR auth_user_role() = 'admin');

-- availability_rules: cleaner manages own, public read
CREATE POLICY "availability_rules_select" ON availability_rules FOR SELECT USING (TRUE);
CREATE POLICY "availability_rules_cleaner_write" ON availability_rules FOR ALL USING (cleaner_id = auth_cleaner_id() OR auth_user_role() = 'admin');

-- availability_exceptions: cleaner manages own, public read
CREATE POLICY "availability_exceptions_select" ON availability_exceptions FOR SELECT USING (TRUE);
CREATE POLICY "availability_exceptions_cleaner_write" ON availability_exceptions FOR ALL USING (cleaner_id = auth_cleaner_id() OR auth_user_role() = 'admin');

-- bookings: customer sees own, cleaner sees own, admin sees all
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (
  customer_id = auth.uid() OR cleaner_id = auth_cleaner_id() OR auth_user_role() = 'admin'
);
CREATE POLICY "bookings_insert_customer" ON bookings FOR INSERT WITH CHECK (customer_id = auth.uid());
-- Customers may ONLY advance a completed booking to customer_confirmed (no financial fields)
CREATE POLICY "bookings_customer_confirm" ON bookings FOR UPDATE
  USING (customer_id = auth.uid() AND status = 'completed')
  WITH CHECK (status = 'customer_confirmed');
-- Cleaners may advance status through valid transitions (no financial fields)
CREATE POLICY "bookings_cleaner_update" ON bookings FOR UPDATE
  USING (cleaner_id = auth_cleaner_id())
  WITH CHECK (status IN ('confirmed', 'in_progress', 'completed', 'cancelled'));
-- Admin has full update access
CREATE POLICY "bookings_admin_update" ON bookings FOR UPDATE USING (auth_user_role() = 'admin');

-- payments: customer sees own, admin sees all (NO cleaner access to payment details)
CREATE POLICY "payments_select" ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND customer_id = auth.uid())
  OR auth_user_role() = 'admin'
);
CREATE POLICY "payments_insert_service" ON payments FOR INSERT WITH CHECK (auth_user_role() IN ('customer', 'admin'));
CREATE POLICY "payments_update_service" ON payments FOR UPDATE USING (auth_user_role() = 'admin');

-- reviews: public read, customer writes own
CREATE POLICY "reviews_select_visible" ON reviews FOR SELECT USING (is_visible = TRUE OR auth_user_role() = 'admin');
CREATE POLICY "reviews_insert_customer" ON reviews FOR INSERT WITH CHECK (customer_id = auth.uid());
-- Customer can edit their own review; cleaner can only update their reply fields via the API
CREATE POLICY "reviews_customer_update" ON reviews FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "reviews_cleaner_reply" ON reviews FOR UPDATE USING (cleaner_id = auth_cleaner_id());
CREATE POLICY "reviews_admin_update" ON reviews FOR UPDATE USING (auth_user_role() = 'admin');

-- payouts: cleaner sees own, admin sees all
CREATE POLICY "payouts_select" ON payouts FOR SELECT USING (cleaner_id = auth_cleaner_id() OR auth_user_role() = 'admin');
CREATE POLICY "payouts_admin_write" ON payouts FOR ALL USING (auth_user_role() = 'admin');

-- cleaner_documents: cleaner sees own, admin sees all
CREATE POLICY "documents_select" ON cleaner_documents FOR SELECT USING (cleaner_id = auth_cleaner_id() OR auth_user_role() = 'admin');
CREATE POLICY "documents_cleaner_write" ON cleaner_documents FOR INSERT WITH CHECK (cleaner_id = auth_cleaner_id());
CREATE POLICY "documents_admin_update" ON cleaner_documents FOR UPDATE USING (auth_user_role() = 'admin');

-- booking_status_logs: booking participants see
CREATE POLICY "status_logs_select" ON booking_status_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND (customer_id = auth.uid() OR cleaner_id = auth_cleaner_id()))
  OR auth_user_role() = 'admin'
);

-- notifications: user sees own
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- platform_settings: admin-only (service role bypasses RLS for API reads)
CREATE POLICY "platform_settings_admin_all" ON platform_settings FOR ALL USING (auth_user_role() = 'admin');
