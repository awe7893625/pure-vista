-- Platform settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('commission_rate', '0.100', '平台抽成比率（10%）'),
  ('payout_delay_days', '14', '撥款延遲天數（客戶確認後）'),
  ('min_booking_amount', '500', '最低預約金額（TWD）'),
  ('ecpay_merchant_id', '', 'ECPay 商家 ID（環境變數優先）');

-- Categories seed
INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
  (uuid_generate_v4(), '居家清潔', 'home-cleaning', '🏠', 1),
  (uuid_generate_v4(), '冷氣清洗', 'ac-cleaning', '❄️', 2),
  (uuid_generate_v4(), '辦公室清潔', 'office-cleaning', '🏢', 3),
  (uuid_generate_v4(), '搬家清潔', 'move-cleaning', '📦', 4),
  (uuid_generate_v4(), '深度清潔', 'deep-cleaning', '✨', 5),
  (uuid_generate_v4(), '玻璃擦拭', 'window-cleaning', '🪟', 6);
