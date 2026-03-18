import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'

export type ServerSupabaseClient = ReturnType<typeof createServerSupabaseClient>

/**
 * Create a Supabase client for server-side use (Route Handlers, Server Components, Server Actions).
 * Uses createServerClient from @supabase/ssr with Next.js cookie store.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Ignore when called from Server Component (no response to set cookies)
        }
      },
    },
  })
}

/**
 * Get the authenticated user (validated with Supabase Auth server).
 * Use this instead of getSession() to avoid the "user may not be authentic" warning.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUser(supabase: ServerSupabaseClient): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}
