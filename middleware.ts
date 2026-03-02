import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
            res = NextResponse.next({ request: req })
            cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
          },
        },
      }
    )

    // Refresh session and set cookies on response
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Middleware session error:', error)
    }

    // Redirect to login if accessing dashboard without session
    if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Redirect authenticated users from root to dashboard (portal home)
    if (session && req.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin))
    }
  } catch (e) {
    console.error('Middleware error:', e)
  }

  return res
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
}
