import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)

    // Get the user
    const { data: { user } } = await supabase.auth.getUser()

    // Try to create user profile if it doesn't exist (for Google OAuth)
    let isNewUser = false;
    if (user) {
      try {
        const { error: insertError } = await supabase
          .from('user')
          .insert({
            user_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            role: null,
          })
          .select()
          .single()

        if (!insertError) {
          isNewUser = true;  // Successfully created new user
        }
      } catch (err) {
        console.log('User profile might already exist, continuing...')
      }

      // If this is a new user, redirect to role selection
      // If existing user, check if they have a role
      if (!isNewUser) {
        const { data: profile } = await supabase
          .from('user')
          .select('role')
          .eq('user_id', user.id)
          .single()

        // If user exists but has no role, send to role selection
        if (profile && !profile.role) {
          isNewUser = true;
        }
      }
    }

    // Redirect based on whether user needs to select a role
    const redirectUrl = isNewUser ? '/role-selection' : '/dashboard';
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  // Default redirect
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
