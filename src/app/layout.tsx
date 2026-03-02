import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '澄境清潔 | Pure Vista — 清潔服務媒合平台',
  description:
    '澄境清潔 Pure Vista 是台灣專業的清潔服務媒合平台，連結有需求的家庭與經過審核的清潔師，提供居家清潔、辦公室清潔、搬家打掃等多元服務。',
  keywords: '清潔服務, 居家清潔, 清潔師, 台灣清潔, Pure Vista, 澄境清潔',
  authors: [{ name: 'Pure Vista Team' }],
  openGraph: {
    title: '澄境清潔 | Pure Vista',
    description: '台灣專業清潔服務媒合平台',
    locale: 'zh_TW',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased bg-[#F8F9F6] text-[#1A1A1A]">
        {children}
      </body>
    </html>
  )
}
