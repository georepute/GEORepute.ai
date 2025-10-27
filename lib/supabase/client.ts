import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Use auth-helpers for proper Next.js cookie integration
export const supabase = createClientComponentClient()