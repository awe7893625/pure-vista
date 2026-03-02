'use client'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface NavbarProps {
  /** Pass the current user session; null = logged out */
  user?: { name?: string } | null
  onLogout?: () => void
}

const NAV_LINKS = [
  { href: '/cleaners', label: '尋找清潔師' },
  { href: '/about', label: '關於我們' },
]

export function Navbar({ user, onLogout }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#E8EDE6]">
      <nav
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
        aria-label="主要導覽"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#8FAD82] rounded-lg"
        >
          {/* Inline SVG leaf mark */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
          >
            <ellipse
              cx="14"
              cy="14"
              rx="10"
              ry="13"
              fill="#8FAD82"
              opacity="0.18"
            />
            <ellipse
              cx="14"
              cy="14"
              rx="6"
              ry="10"
              fill="#8FAD82"
              opacity="0.55"
            />
            <ellipse cx="14" cy="14" rx="3" ry="7" fill="#8FAD82" />
          </svg>
          <span className="text-[#1A1A1A] font-semibold text-base tracking-tight leading-none">
            澄境清潔
            <span className="hidden sm:inline text-[#8FAD82] font-normal ml-1 text-sm">
              Pure Vista
            </span>
          </span>
        </Link>

        {/* Desktop nav links (center) */}
        <ul className="hidden md:flex items-center gap-8" role="list">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-[#6B7280] hover:text-[#1A1A1A] transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-[#8FAD82] rounded"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop auth (right) */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-[#6B7280]">
                {user.name ?? '會員'}
              </span>
              <button
                onClick={onLogout}
                className="text-sm px-4 py-2 rounded-xl border border-[#E8EDE6] text-[#6B7280] hover:bg-[#F8F9F6] hover:text-[#1A1A1A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#8FAD82]"
              >
                登出
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm px-4 py-2 rounded-xl text-[#6B7280] hover:text-[#1A1A1A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#8FAD82]"
              >
                登入
              </Link>
              <Link
                href="/register"
                className="text-sm px-4 py-2.5 rounded-xl bg-[#8FAD82] text-white hover:bg-[#6B8F5E] transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-[#8FAD82] focus:ring-offset-2"
              >
                免費註冊
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F8F9F6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#8FAD82]"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? '關閉選單' : '開啟選單'}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={cn(
          'md:hidden border-t border-[#E8EDE6] bg-white overflow-hidden transition-all duration-200',
          menuOpen ? 'max-h-64' : 'max-h-0'
        )}
      >
        <ul className="px-4 py-3 space-y-1" role="list">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block px-3 py-2.5 rounded-xl text-sm text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F8F9F6] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="px-4 pb-4 flex flex-col gap-2">
          {user ? (
            <button
              onClick={() => {
                setMenuOpen(false)
                onLogout?.()
              }}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-[#E8EDE6] text-[#6B7280] hover:bg-[#F8F9F6] transition-colors"
            >
              登出
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="block w-full text-center text-sm px-4 py-2.5 rounded-xl border border-[#E8EDE6] text-[#6B7280] hover:bg-[#F8F9F6] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                登入
              </Link>
              <Link
                href="/register"
                className="block w-full text-center text-sm px-4 py-2.5 rounded-xl bg-[#8FAD82] text-white hover:bg-[#6B8F5E] transition-colors font-medium"
                onClick={() => setMenuOpen(false)}
              >
                免費註冊
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
