# Pure Vista（澄境清潔）— 專案指引

## 概述
清潔服務媒合平台。清潔師上架服務、客戶線上預約付款、平台收 10% 抽成。

## 技術架構
- Next.js 16 App Router + TypeScript + TailwindCSS
- Supabase（Auth + PostgreSQL + Storage）
- ECPay 信用卡付款
- Vercel 部署

## 品牌規範
- 主色：鼠尾草綠 `#8FAD82`
- 輔色：淺透藍 `#A8C5DA`
- 風格：極簡、大留白、editorial
- 字體：Helvetica Neue / Arial / system-ui

## 路徑
- 客戶前台：`src/app/(customer)/`
- 清潔師後台：`src/app/(provider)/`
- 管理後台：`src/app/(admin)/`
- API：`src/app/api/`
- 共用元件：`src/components/ui/`
- 核心邏輯：`src/lib/`
- 類型定義：`src/types/`
- DB Schema：`supabase/migrations/`

## ECPay 重要提醒
- CheckMacValue 空格必須 `+`，不能 `%20`
- ChoosePayment 必須 `'Credit'`
- 測試環境：payment-stage.ecpay.com.tw

## 金額規則
- 全部用整數 TWD（不用小數）
- platform_commission = round(total * 0.10)
- cleaner_payout = total - platform_commission

## Booking 狀態機
pending_payment -> paid -> confirmed -> in_progress -> completed -> customer_confirmed
                                                               -> cancelled / disputed
