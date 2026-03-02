---
active: true
phase: task
review_id: 20260302-143114-f393cf
started_at: 2026-03-02T06:31:14Z
---

Pure Vista 澄境清潔平台初始化（71 個檔案）：
- Next.js 16 App Router + TypeScript + TailwindCSS + Supabase + ECPay
- 客戶前台：Landing、清潔師搜尋/個人頁、預約流程、Auth 登入/註冊、訂單紀錄
- 清潔師後台：Dashboard、服務 CRUD、訂單管理（接受/拒絕/完成）、收入頁面、Onboarding
- 管理後台：儀表板、清潔師審核、訂單列表、撥款佇列
- API：POST /api/bookings、ECPay create/notify/return、清潔師服務/訂單 CRUD、Admin 清潔師/撥款 API
- DB Schema：14 張資料表 + RLS + seed（supabase/migrations/）
- 核心 lib：ECPay CheckMacValue（複製 AutoMerch 實作）、booking 狀態機、Supabase server/client/middleware
- 品牌色：鼠尾草綠 #8FAD82
