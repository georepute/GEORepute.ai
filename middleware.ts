import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  // This is critical - it refreshes the session and sets cookies
  await supabase.auth.getSession()

  // Get the session after refresh
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if user is accessing dashboard without being authenticated
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // IMPORTANT: Return res to ensure cookies are set
  return res
}

export const config = {
  matcher: ['/dashboard/:path*'],
}

