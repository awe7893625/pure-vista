import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Add pathname to request headers so server components can read it via headers()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  const response = await updateSession(request)

  // Copy any cookies from the updateSession response, then also set x-pathname
  const nextResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Merge cookies from updateSession into nextResponse
  response.cookies.getAll().forEach((cookie) => {
    nextResponse.cookies.set(cookie)
  })

  return nextResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
