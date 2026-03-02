import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8F9F6] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-[#8FAD82] mb-4">404</p>
        <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-2">頁面不存在</h1>
        <p className="text-[#9CA3AF] mb-8">
          抱歉，你尋找的頁面已移除或從未存在。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-[#8FAD82] text-white rounded-xl text-sm font-medium hover:bg-[#6B8F5E] transition-colors"
          >
            回到首頁
          </Link>
          <Link
            href="/cleaners"
            className="px-6 py-3 border border-[#E8EDE6] text-[#6B7280] rounded-xl text-sm font-medium hover:bg-white transition-colors"
          >
            尋找清潔師
          </Link>
        </div>
        <p className="text-[#8FAD82] font-bold mt-12">澄境清潔 Pure Vista</p>
      </div>
    </div>
  )
}
